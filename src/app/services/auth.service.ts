import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { User } from '@supabase/supabase-js';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    constructor(private supabaseService: SupabaseService) {
        this.loadUser();
    }

    private async loadUser() {
        try {
            const { data: { user }, error } = await this.supabaseService.supabase.auth.getUser();
            if (error) throw error;
            this.currentUserSubject.next(user);
        } catch (error) {
            console.error('Error loading user:', error);
            this.currentUserSubject.next(null);
        }
    }

    async signIn(email: string, password: string): Promise<{ success: boolean; error?: any }> {
        try {
            const { data, error } = await this.supabaseService.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            this.currentUserSubject.next(data.user);
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

            this.currentUserSubject.next(data.user);
            return { success: true };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error };
        }
    }

    async signOut(): Promise<void> {
        try {
            await this.supabaseService.supabase.auth.signOut();
            this.currentUserSubject.next(null);
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }

    isAuthenticated(): boolean {
        return this.currentUserSubject.value !== null;
    }

    getCurrentUser(): User | null {
        return this.currentUserSubject.value;
    }

    getUserEmail(): string | null {
        return this.currentUserSubject.value?.email || null;
    }

    getUserName(): string | null {
        return this.currentUserSubject.value?.user_metadata['name'] || null;
    }
}