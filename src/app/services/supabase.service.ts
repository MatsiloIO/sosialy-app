import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import {
    Balance,
    Contribution,
    ContributionForm,
    Expense,
    ExpenseForm,
    Member,
    MemberForm,
    OtherRevenue,
    OtherRevenueForm
} from '../models';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
    private supabase: SupabaseClient;

    constructor() {
        // Configuration sans auth pour éviter les locks
        this.supabase = createClient(
            environment.supabaseUrl,
            environment.supabaseAnonKey,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            }
        );
    }

    private handleArray<T>(data: T[] | null, error: any): T[] {
        if (error) throw error;
        return data ?? [];
    }

    private handleNumberRows(data: Array<{ montant: number }> | null, error: any): Array<{ montant: number }> {
        if (error) throw error;
        return data ?? [];
    }

    // ========== MEMBRES ==========
    async getMembers(): Promise<Member[]> {
        const { data, error } = await this.supabase
            .from('members')
            .select('*')
            .order('nom');
        return this.handleArray(data, error);
    }

    async addMember(member: MemberForm): Promise<Member[]> {
        const { data, error } = await this.supabase
            .from('members')
            .insert([member])
            .select();
        return this.handleArray(data, error);
    }

    async updateMember(id: number, member: MemberForm): Promise<Member[]> {
        const { data, error } = await this.supabase
            .from('members')
            .update(member)
            .eq('id', id)
            .select();
        return this.handleArray(data, error);
    }

    async deleteMember(id: number): Promise<boolean> {
        const { error } = await this.supabase
            .from('members')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    }

    // ========== COTISATIONS ==========
    async getContributions(): Promise<Contribution[]> {
        const { data, error } = await this.supabase
            .from('contributions')
            .select('*, members(nom, prenom, im)')
            .order('date', { ascending: false });
        return this.handleArray(data, error);
    }

    async getContributionsByMember(memberId: number): Promise<Contribution[]> {
        const { data, error } = await this.supabase
            .from('contributions')
            .select('*')
            .eq('member_id', memberId)
            .order('date', { ascending: false });
        return this.handleArray(data, error);
    }

    async addContribution(contribution: ContributionForm): Promise<Contribution[]> {
        const { data, error } = await this.supabase
            .from('contributions')
            .insert([contribution])
            .select();
        return this.handleArray(data, error);
    }

    // ========== AUTRES RECETTES ==========
    async getOtherRevenues(): Promise<OtherRevenue[]> {
        const { data, error } = await this.supabase
            .from('other_revenues')
            .select('*')
            .order('date', { ascending: false });
        return this.handleArray(data, error);
    }

    async addOtherRevenue(revenue: OtherRevenueForm): Promise<OtherRevenue[]> {
        const { data, error } = await this.supabase
            .from('other_revenues')
            .insert([revenue])
            .select();
        return this.handleArray(data, error);
    }

    async deleteOtherRevenue(id: number): Promise<boolean> {
        const { error } = await this.supabase
            .from('other_revenues')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    }

    // ========== DÉPENSES ==========
    async getExpenses(): Promise<Expense[]> {
        const { data, error } = await this.supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false });
        return this.handleArray(data, error);
    }

    async addExpense(expense: ExpenseForm): Promise<Expense[]> {
        const { data, error } = await this.supabase
            .from('expenses')
            .insert([expense])
            .select();
        return this.handleArray(data, error);
    }

    async updateExpense(id: number, expense: ExpenseForm): Promise<Expense[]> {
        const { data, error } = await this.supabase
            .from('expenses')
            .update(expense)
            .eq('id', id)
            .select();
        return this.handleArray(data, error);
    }

    async deleteExpense(id: number): Promise<boolean> {
        const { error } = await this.supabase
            .from('expenses')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    }

    // ========== AGRÉGATIONS CAISSE ==========
    async getTotalContributions(): Promise<number> {
        const { data, error } = await this.supabase
            .from('contributions')
            .select('montant');
        const rows = this.handleNumberRows(data, error);
        return rows.reduce((sum, row) => sum + row.montant, 0);
    }

    async getTotalOtherRevenues(): Promise<number> {
        const { data, error } = await this.supabase
            .from('other_revenues')
            .select('montant');
        const rows = this.handleNumberRows(data, error);
        return rows.reduce((sum, row) => sum + row.montant, 0);
    }

    async getTotalExpenses(): Promise<number> {
        const { data, error } = await this.supabase
            .from('expenses')
            .select('montant');
        const rows = this.handleNumberRows(data, error);
        return rows.reduce((sum, row) => sum + row.montant, 0);
    }

    async getBalance(): Promise<Balance> {
        const totalRecettes = await this.getTotalContributions();
        const totalOther = await this.getTotalOtherRevenues();
        const totalDepenses = await this.getTotalExpenses();
        return {
            totalRecettes: totalRecettes + totalOther,
            totalDepenses,
            solde: totalRecettes + totalOther - totalDepenses
        };
    }

    // ========== COTISATIONS MENSUELLES ==========

    async getContributionsByMemberAndYear(memberId: number, annee: number): Promise<Contribution[]> {
        const { data, error } = await this.supabase
            .from('contributions')
            .select('*')
            .eq('member_id', memberId)
            .eq('annee', annee);
        return this.handleArray(data, error);
    }

    async addContributionWithDate(contribution: ContributionForm): Promise<Contribution[]> {
        const { data, error } = await this.supabase
            .from('contributions')
            .insert([contribution])
            .select();
        const newContribution = this.handleArray(data, error);

        const revenue: OtherRevenueForm = {
            date: contribution.date,
            libelle: `Cotisation ${contribution.mois_reference}`,
            montant: contribution.montant,
            categorie: 'cotisation'
        };
        await this.addOtherRevenue(revenue);

        return newContribution;
    }

    async deleteContribution(id: number) {
        const { error } = await this.supabase
            .from('contributions')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    }

    // ========== CATÉGORIES (référence) ==========
    async getExpenseCategories(): Promise<Array<{ id: number; name: string }>> {
        const { data, error } = await this.supabase
            .from('expense_categories')
            .select('id, name')
            .order('name', { ascending: true });
        return this.handleArray(data, error) as Array<{ id: number; name: string }>;
    }

    async getRevenueCategories(): Promise<Array<{ id: number; name: string }>> {
        const { data, error } = await this.supabase
            .from('revenue_categories')
            .select('id, name')
            .order('name', { ascending: true });
        return this.handleArray(data, error) as Array<{ id: number; name: string }>;
    }

    async getAppSettings(): Promise<Record<string, any> | null> {
        const { data, error } = await this.supabase
            .from('app_settings')
            .select('name, value')
            .in('name', ['montantA', 'montantB']);
        if (error) {
            console.error('Erreur getAppSettings:', error);
            return null;
        }
        const rows = this.handleArray(data, error) as Array<{ name: string; value: any }>;
        if (rows.length === 0) {
            return null;
        }
        const settings: Record<string, any> = {};
        rows.forEach(r => {
            settings[r.name] = r.value;
        });
        return settings;
    }

    async upsertAppSettings(settings: Record<string, any>): Promise<void> {
        const payload = Object.keys(settings).map((k) => ({ name: k, value: settings[k] }));
        const { error } = await this.supabase
            .from('app_settings')
            .upsert(payload, { onConflict: 'name' })
            .select();
        if (error) {
            console.error('Erreur upsertAppSettings:', error);
            throw error;
        }
    }

    // NOTE: use SettingsService.getMontantCotisation for dynamic values
    getMontantCotisation(categorie: string): number {
        return categorie === 'A' ? 5000 : 3000;
    }

    async getContributionsByYear(annee: number): Promise<Contribution[]> {
        const { data, error } = await this.supabase
            .from('contributions')
            .select('*, members(nom, prenom, im)')
            .eq('annee', annee);
        if (error) {
            console.error('Erreur getContributionsByYear:', error);
            throw error;
        }
        return data ?? [];
    }
}