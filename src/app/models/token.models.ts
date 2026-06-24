// src/app/models/token.models.ts

export interface TokenType {
    id: number;
    name: string;
    montant: number;
    is_active: boolean;
    created_at: string;
}

export interface MemberToken {
    id: number;
    member_id: number;
    token_type_id: number;
    statut: 'en_attente' | 'paye' | 'annule';
    date_attribution: string;
    date_paiement?: string;
    mode_paiement?: 'especes' | 'cheque' | 'virement';
    montant: number;
    revenue_id?: number;
    created_at: string;
    member?: {
        nom: string;
        prenom: string;
        im: string;
    };
    token_type?: {
        id: number;
        name: string;
        montant: number;
    };
}

export interface MemberTokenForm {
    member_id: number;
    token_type_id: number;
    montant: number;
    date_attribution?: string;
}

export interface TokenPaymentForm {
    token_ids: number[];
    date_paiement: string;
    mode_paiement: 'especes' | 'cheque' | 'virement';
}

export interface TokenStats {
    total_attribues: number;
    total_payes: number;
    total_impayes: number;
    montant_total: number;
    montant_paye: number;
    montant_impaye: number;
    taux_paiement: number;
}

export interface MemberTokenSummary {
    member_id: number;
    nom: string;
    prenom: string;
    im: string;
    total_tokens: number;
    tokens_payes: number;
    tokens_impayes: number;
    montant_total: number;
    montant_paye: number;
    montant_impaye: number;
    taux_paiement: number;
}