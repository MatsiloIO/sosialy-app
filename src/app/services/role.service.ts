// src/app/services/role.service.ts
import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({
    providedIn: 'root'
})
export class RoleService {
    private supabase: SupabaseClient;

    constructor(
        private authService: AuthService,
        private supabaseService: SupabaseService
    ) {
        this.supabase = this.supabaseService.supabase;
    }

    async assignRole(userEmail: string, newRole: 'editor' | 'admin'): Promise<{ success: boolean; message: string }> {
        try {
            const { data, error } = await this.supabase.rpc('assign_role', {
                user_email: userEmail,
                new_role: newRole
            });

            if (error) throw error;

            const currentUser = await this.supabase.auth.getUser();
            if (currentUser.data.user?.email === userEmail) {
                await this.authService.forceRefreshAfterRoleChange();
            }

            return { success: true, message: `Rôle ${newRole} attribué à ${userEmail}` };
        } catch (error: any) {
            console.error('Erreur attribution rôle:', error);
            return { success: false, message: error.message };
        }
    }

    async getAllUsersWithRoles(): Promise<any[]> {
        try {
            // Utiliser la fonction RPC
            const { data, error } = await this.supabase.rpc('get_all_users');

            if (error) {
                console.error('Erreur RPC get_all_users:', error);
                return this.getCurrentUserOnly();
            }

            if (data && Array.isArray(data)) {
                return data.map(user => ({
                    ...user,
                    selectedRole: user.role === 'admin' ? 'admin' : 'editor',
                    updating: false
                }));
            }

            return this.getCurrentUserOnly();
        } catch (error) {
            console.error('Erreur récupération utilisateurs:', error);
            return this.getCurrentUserOnly();
        }
    }

    // Fallback : retourner uniquement l'utilisateur courant
    private async getCurrentUserOnly(): Promise<any[]> {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (user) {
            return [{
                id: user.id,
                email: user.email,
                role: this.authService.getCurrentRole(),
                selectedRole: this.authService.getCurrentRole(),
                updating: false
            }];
        }
        return [];
    }
}