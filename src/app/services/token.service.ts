// src/app/services/token.service.ts
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
    MemberToken,
    MemberTokenForm,
    TokenPaymentForm,
    TokenStats,
    MemberTokenSummary,
    TokenType
} from '../models/token.models';

@Injectable({
    providedIn: 'root'
})
export class TokenService {
    constructor(private supabase: SupabaseService) { }

    // ========== TYPES DE JETONS ==========
    async getTokenTypes(): Promise<TokenType[]> {
        const { data, error } = await this.supabase.supabase
            .from('token_types')
            .select('*')
            .eq('is_active', true)
            .order('montant', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async createTokenType(name: string, montant: number): Promise<void> {
        const { error } = await this.supabase.supabase
            .from('token_types')
            .insert([{ name, montant, is_active: true }]);

        if (error) throw error;
    }

    async updateTokenType(id: number, name: string, montant: number): Promise<void> {
        const { error } = await this.supabase.supabase
            .from('token_types')
            .update({ name, montant })
            .eq('id', id);

        if (error) throw error;
    }

    async deleteTokenType(id: number): Promise<void> {
        const { error } = await this.supabase.supabase
            .from('token_types')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;
    }

    // ========== JETONS PAR MEMBRE ==========
    async getMemberTokens(memberId: number): Promise<MemberToken[]> {
        const { data, error } = await this.supabase.supabase
            .from('member_tokens')
            .select(`
        *,
        member:members!member_id (nom, prenom, im),
        token_type:token_types!token_type_id (id, name, montant)
      `)
            .eq('member_id', memberId)
            .order('date_attribution', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async getAllTokens(filters?: { statut?: string; member_id?: number }): Promise<MemberToken[]> {
        let query = this.supabase.supabase
            .from('member_tokens')
            .select(`
      *,
      member:members!member_id (nom, prenom, im),
      token_type:token_types!token_type_id (id, name, montant)
    `)
            .order('date_attribution', { ascending: false });

        // Filtrer par statut si demandé
        if (filters?.statut) {
            if (filters.statut === 'paye') {
                query = query.not('date_paiement', 'is', null);
            } else if (filters.statut === 'en_attente') {
                query = query.is('date_paiement', null);
            }
        }

        if (filters?.member_id) {
            query = query.eq('member_id', filters.member_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async assignToken(token: MemberTokenForm): Promise<MemberToken> {
        const { data, error } = await this.supabase.supabase
            .from('member_tokens')
            .insert([{
                member_id: token.member_id,
                token_type_id: token.token_type_id,
                montant: token.montant,
                statut: 'en_attente',
                date_attribution: token.date_attribution ?? new Date().toISOString().split('T')[0]
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async assignMultipleTokens(memberId: number, tokenTypeId: number, quantity: number, dateAttribution: string = new Date().toISOString().split('T')[0]): Promise<void> {
        const tokenType = await this.getTokenTypeById(tokenTypeId);
        if (!tokenType) throw new Error('Type de jeton introuvable');

        const tokens = [];
        for (let i = 0; i < quantity; i++) {
            tokens.push({
                member_id: memberId,
                token_type_id: tokenTypeId,
                montant: tokenType.montant,
                statut: 'en_attente',
                date_attribution: dateAttribution
            });
        }

        const { error } = await this.supabase.supabase
            .from('member_tokens')
            .insert(tokens);

        if (error) throw error;
    }

    async payTokens(payment: TokenPaymentForm): Promise<void> {
        try {
            const { data: tokens, error: tokensError } = await this.supabase.supabase
                .from('member_tokens')
                .select(`
          *,
          member:members!member_id (id, nom, prenom, im),
          token_type:token_types!token_type_id (id, name, montant)
        `)
                .in('id', payment.token_ids);

            if (tokensError) throw tokensError;
            if (!tokens || tokens.length === 0) throw new Error('Aucun jeton trouvé');

            for (const token of tokens) {
                const revenueData = {
                    date: payment.date_paiement,
                    libelle: `Paiement jeton - ${token.token_type?.name || 'Jeton'} - ${token.member?.prenom || ''} ${token.member?.nom || ''}`,
                    montant: token.montant,
                    category_id: 1
                };

                const { data: revenue, error: revenueError } = await this.supabase.supabase
                    .from('other_revenues')
                    .insert([revenueData])
                    .select()
                    .single();

                if (revenueError) throw revenueError;

                const { error: updateError } = await this.supabase.supabase
                    .from('member_tokens')
                    .update({
                        statut: 'paye',
                        date_paiement: payment.date_paiement,
                        mode_paiement: payment.mode_paiement,
                        revenue_id: revenue.id
                    })
                    .eq('id', token.id);

                if (updateError) throw updateError;
            }
        } catch (error) {
            console.error('Erreur lors du paiement:', error);
            throw error;
        }
    }

    async cancelToken(tokenId: number): Promise<void> {
        try {
            // 1. Récupérer le jeton pour connaître son revenue_id
            const { data: token, error: tokenError } = await this.supabase.supabase
                .from('member_tokens')
                .select('revenue_id')
                .eq('id', tokenId)
                .single();

            if (tokenError) throw tokenError;

            // 2. Si une recette est associée (jeton payé), supprimer la recette
            if (token?.revenue_id) {
                const { error: revenueError } = await this.supabase.supabase
                    .from('other_revenues')
                    .delete()
                    .eq('id', token.revenue_id);

                if (revenueError) throw revenueError;
            }

            // 3. Supprimer définitivement le jeton
            const { error: deleteError } = await this.supabase.supabase
                .from('member_tokens')
                .delete()
                .eq('id', tokenId);

            if (deleteError) throw deleteError;

            console.log(`✅ Jeton ${tokenId} supprimé définitivement`);

        } catch (error) {
            console.error('Erreur lors de la suppression du jeton:', error);
            throw error;
        }
    }

    async getTokenStats(): Promise<TokenStats> {
        const { data, error } = await this.supabase.supabase
            .from('member_tokens')
            .select('montant, date_paiement');

        if (error) throw error;

        const total = data || [];
        const payes = total.filter(t => t.date_paiement !== null);
        const impayes = total.filter(t => t.date_paiement === null);

        const totalMontant = total.reduce((sum, t) => sum + (t.montant || 0), 0);

        return {
            total_attribues: total.length,
            total_payes: payes.length,
            total_impayes: impayes.length,
            montant_total: totalMontant,
            montant_paye: payes.reduce((sum, t) => sum + (t.montant || 0), 0),
            montant_impaye: impayes.reduce((sum, t) => sum + (t.montant || 0), 0),
            taux_paiement: total.length > 0 ? Math.round((payes.length / total.length) * 100) : 0
        };
    }

    async getMemberTokenSummary(): Promise<MemberTokenSummary[]> {
        const { data, error } = await this.supabase.supabase
            .from('member_tokens')
            .select(`
        member_id,
        statut,
        montant,
        member:members!member_id (nom, prenom, im)
      `);

        if (error) throw error;

        const summaryMap = new Map<number, MemberTokenSummary>();

        for (const token of data || []) {
            const memberId = token.member_id;
            const memberData = token.member as unknown as { nom: string; prenom: string; im: string };

            if (!summaryMap.has(memberId)) {
                summaryMap.set(memberId, {
                    member_id: memberId,
                    nom: memberData?.nom || '',
                    prenom: memberData?.prenom || '',
                    im: memberData?.im || '',
                    total_tokens: 0,
                    tokens_payes: 0,
                    tokens_impayes: 0,
                    montant_total: 0,
                    montant_paye: 0,
                    montant_impaye: 0,
                    taux_paiement: 0
                });
            }

            const summary = summaryMap.get(memberId)!;
            summary.total_tokens++;
            summary.montant_total += token.montant || 0;

            if (token.statut === 'paye') {
                summary.tokens_payes++;
                summary.montant_paye += token.montant || 0;
            } else if (token.statut === 'en_attente') {
                summary.tokens_impayes++;
                summary.montant_impaye += token.montant || 0;
            }

            summary.taux_paiement = summary.total_tokens > 0
                ? Math.round((summary.tokens_payes / summary.total_tokens) * 100)
                : 0;
        }

        return Array.from(summaryMap.values());
    }

    private async getTokenTypeById(id: number): Promise<TokenType | null> {
        const { data, error } = await this.supabase.supabase
            .from('token_types')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    }
}