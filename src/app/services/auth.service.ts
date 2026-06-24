/*src/app/services/auth.service.ts*/
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject } from 'rxjs';
import { User, Session } from '@supabase/supabase-js';

export type UserRole = 'visitor' | 'editor' | 'admin';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    private currentSessionSubject = new BehaviorSubject<Session | null>(null);
    public currentSession$ = this.currentSessionSubject.asObservable();

    private currentRoleSubject = new BehaviorSubject<UserRole>('visitor');
    public currentRole$ = this.currentRoleSubject.asObservable();

    // ✅ Ajouter un subject pour l'état de chargement
    private loadingSubject = new BehaviorSubject<boolean>(true);
    public loading$ = this.loadingSubject.asObservable();

    private refreshTimer: any;

    constructor(private supabaseService: SupabaseService) {
        this.loadUser();
        this.setupAuthListener();
    }

    private setupAuthListener() {
        this.supabaseService.supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);
            this.currentUserSubject.next(session?.user ?? null);
            this.currentSessionSubject.next(session);

            if (session?.access_token) {
                this.extractRoleFromJWT(session.access_token);
                this.scheduleTokenRefresh(session.expires_at);
            } else {
                this.currentRoleSubject.next('visitor');
                this.stopRefreshTimer();
            }

            // ✅ Une fois l'état d'auth chargé, arrêter le loading
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
                this.loadingSubject.next(false);
            }
        });
    }

    async createUser(options: {
        email: string;
        password: string;
        fullName: string;
        phone?: string;
        role: 'editor' | 'admin';
        requirePasswordChange?: boolean;
    }): Promise<{ success: boolean; error?: any; message?: string }> {
        try {
            console.log('📝 Création utilisateur par admin (RPC):', options.email);

            const { data, error } = await this.supabaseService.supabase.rpc('admin_create_user', {
                user_email: options.email,
                user_password: options.password,
                user_full_name: options.fullName,
                user_phone: options.phone || '',
                user_role: options.role,
                require_password_change: options.requirePasswordChange !== false
            });

            if (!error && data) {
                console.log('✅ Réponse RPC:', data);
                if (data && !data.success) {
                    // RPC handled but returned failure
                    console.warn('RPC returned failure:', data.error);
                } else {
                    try { await this.supabaseService.recordAudit('create_user_rpc', { email: options.email, role: options.role, response: data }).catch(() => { }); } catch (e) { }
                    return { success: true, message: data?.message };
                }
            } else if (error) {
                console.warn('RPC error, will try fallback signUp:', error);
            }

            // Fallback: essayer de créer l'utilisateur via signUp puis insérer la ligne dans `users`
            console.log('🔁 Tentative de secours : signUp + insert dans users');
            const { data: signUpData, error: signUpError } = await this.supabaseService.supabase.auth.signUp({
                email: options.email,
                password: options.password,
                options: {
                    data: { name: options.fullName }
                }
            } as any);

            if (signUpError) {
                console.error('❌ Erreur signUp fallback:', signUpError);
                return { success: false, error: signUpError };
            }

            const createdUser = (signUpData as any)?.user;
            if (!createdUser || !createdUser.id) {
                const msg = 'Création utilisateur échouée : user id manquant après signUp';
                console.error(msg, signUpData);
                return { success: false, error: { message: msg } };
            }

            // Insérer la ligne dans la table application `users` si nécessaire
            try {
                const { error: insertError } = await this.supabaseService.supabase
                    .from('users')
                    .insert([{
                        id: createdUser.id,
                        email: options.email,
                        full_name: options.fullName,
                        phone: options.phone || '',
                        role: options.role
                    }]);

                if (insertError) {
                    console.error('❌ Erreur insertion table users:', insertError);
                    // Don't fail hard: return success for auth creation but warn
                    try { await this.supabaseService.recordAudit('create_user_fallback_insert_failed', { email: options.email, role: options.role, error: insertError }).catch(() => { }); } catch (e) { }
                    return { success: true, message: 'Utilisateur créé mais insertion users a échoué', error: insertError };
                }
            } catch (e) {
                console.error('❌ Exception insertion users:', e);
                try { await this.supabaseService.recordAudit('create_user_fallback_insert_exception', { email: options.email, role: options.role, error: e }).catch(() => { }); } catch (err) { }
                return { success: true, message: 'Utilisateur créé mais insertion users a échoué', error: e };
            }

            try { await this.supabaseService.recordAudit('create_user_fallback', { email: options.email, role: options.role, created_user_id: createdUser.id }).catch(() => { }); } catch (e) { }

            return { success: true, message: 'Utilisateur créé avec succès (fallback)' };
        } catch (error) {
            console.error('❌ Exception finale création utilisateur:', error);
            return { success: false, error };
        }
    }

    private async loadUser() {
        try {
            const { data: { session }, error } = await this.supabaseService.supabase.auth.getSession();

            if (error) {
                console.error('Error getting session:', error);
                this.currentUserSubject.next(null);
                this.currentSessionSubject.next(null);
                this.currentRoleSubject.next('visitor');
                return;
            }

            const user = session?.user ?? null;
            this.currentUserSubject.next(user);
            this.currentSessionSubject.next(session);

            if (session?.access_token) {
                this.extractRoleFromJWT(session.access_token);
                this.scheduleTokenRefresh(session.expires_at);
            } else {
                this.currentRoleSubject.next('visitor');
            }

            if (!user) {
                console.log('Aucune session active - utilisateur non connecté');
            }
        } catch (error) {
            console.error('Unexpected error loading user:', error);
            this.currentUserSubject.next(null);
            this.currentSessionSubject.next(null);
            this.currentRoleSubject.next('visitor');
        } finally {
            this.loadingSubject.next(false); // ✅ Fin chargement
        }
    }

    // ✅ Ajouter une méthode pour vérifier si le chargement est fini
    isLoading(): boolean {
        return this.loadingSubject.value;
    }

    private extractRoleFromJWT(token: string): void {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('🔍 JWT COMPLET:', payload);
            console.log('🔍 user_role:', payload.user_role);
            console.log('🔍 role:', payload.role);
            console.log('🔍 app_metadata:', payload.app_metadata);
            const role = payload.user_role || payload.app_metadata?.role || 'visitor';
            console.log('🔍 Rôle final:', role);
            this.currentRoleSubject.next(role as UserRole);
        } catch (e) {
            console.error('❌ Erreur décodage JWT:', e);
            this.currentRoleSubject.next('visitor');
        }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const role = payload.user_role || payload.app_metadata?.role || 'visitor';
            this.currentRoleSubject.next(role as UserRole);
            console.log('✅ Rôle extrait du JWT:', role);
        } catch (e) {
            console.error('❌ Erreur décodage JWT:', e);
            this.currentRoleSubject.next('visitor');
        }
    }

    private scheduleTokenRefresh(expiresAt: number | undefined): void {
        // Si pas d'expiration, ne pas programmer
        if (!expiresAt) {
            console.log('⚠️ Pas d\'expiration définie, refresh non programmé');
            return;
        }

        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - now;

        // Ne pas programmer si déjà expiré
        if (timeUntilExpiry <= 0) {
            console.log('⚠️ Token déjà expiré');
            return;
        }

        // Rafraîchir 5 minutes avant expiration
        const refreshDelay = Math.max((timeUntilExpiry - 300) * 1000, 60000);

        console.log(`⏰ Refresh token programmé dans ${Math.floor(refreshDelay / 1000)} secondes`);

        if (refreshDelay > 0 && refreshDelay < 24 * 60 * 60 * 1000) {
            this.stopRefreshTimer();
            this.refreshTimer = setTimeout(() => {
                this.refreshToken();
            }, refreshDelay);
        }
    }

    private stopRefreshTimer(): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    async refreshToken(): Promise<boolean> {
        try {
            console.log('🔄 Rafraîchissement du token...');
            const { data, error } = await this.supabaseService.supabase.auth.refreshSession();

            if (error) {
                console.error('❌ Erreur refresh:', error);
                return false;
            }

            if (data.session) {
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Exception lors du refresh:', error);
            return false;
        }
    }

    async forceRefreshAfterRoleChange(): Promise<void> {
        console.log('🔄 Rechargement après changement de rôle...');
        await this.refreshSession();
    }

    async signIn(email: string, password: string): Promise<{ success: boolean; error?: any }> {
        try {
            const { data, error } = await this.supabaseService.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error };
        }
    }

    async signUp(email: string, password: string, name?: string): Promise<{ success: boolean; error?: any }> {
        try {
            const { data, error } = await this.supabaseService.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name || ''
                    }
                }
            });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error };
        }
    }

    async signOut(): Promise<void> {
        try {
            this.stopRefreshTimer();
            await this.supabaseService.supabase.auth.signOut();
            this.currentUserSubject.next(null);
            this.currentSessionSubject.next(null);
            this.currentRoleSubject.next('visitor');
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }

    isAuthenticated(): boolean {
        return this.currentUserSubject.value !== null;
    }

    isSessionActive(): boolean {
        const session = this.currentSessionSubject.value;
        if (!session) return false;

        const expiresAt = session.expires_at;
        if (expiresAt) {
            return Date.now() / 1000 < expiresAt;
        }
        return true;
    }

    getCurrentUser(): User | null {
        return this.currentUserSubject.value;
    }

    getCurrentSession(): Session | null {
        return this.currentSessionSubject.value;
    }

    getUserEmail(): string | null {
        return this.currentUserSubject.value?.email || null;
    }

    getUserName(): string | null {
        return this.currentUserSubject.value?.user_metadata?.['name'] || null;
    }

    getCurrentRole(): UserRole {
        return this.currentRoleSubject.value;
    }

    hasRole(requiredRole: UserRole): boolean {
        const roleHierarchy = { visitor: 0, editor: 1, admin: 2 };
        const current = roleHierarchy[this.currentRoleSubject.value];
        const required = roleHierarchy[requiredRole];
        return current >= required;
    }

    canEdit(): boolean {
        return this.hasRole('editor') || this.hasRole('admin');
    }

    isAdmin(): boolean {
        return this.hasRole('admin');
    }

    isVisitor(): boolean {
        return !this.isAuthenticated();
    }

    async refreshSession(): Promise<void> {
        const { data: { session }, error } = await this.supabaseService.supabase.auth.getSession();
        if (!error) {
            this.currentUserSubject.next(session?.user ?? null);
            this.currentSessionSubject.next(session);
            if (session?.access_token) {
                this.extractRoleFromJWT(session.access_token);
                this.scheduleTokenRefresh(session.expires_at);
            }
        }
    }
}