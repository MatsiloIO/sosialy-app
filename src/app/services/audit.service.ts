import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuditService {
    constructor(private supabase: SupabaseService, private auth: AuthService) { }

    async log(action: string, details?: any): Promise<void> {
        try {
            const user = this.auth.getCurrentUser();
            const payload: any = {
                action,
                details: details ? JSON.stringify(details) : null,
                created_at: new Date().toISOString()
            };

            if (user) {
                payload.user_id = user.id;
                payload.user_email = user.email;
                payload.user_name = this.auth.getUserName() || null;
            }

            const { error } = await this.supabase.supabase.from('audit_logs').insert([payload]);
            if (error) console.error('Audit log error:', error);
        } catch (e) {
            console.error('Audit log exception:', e);
        }
    }

    async getLogs(): Promise<any[]> {
        const { data, error } = await this.supabase.supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }
}
