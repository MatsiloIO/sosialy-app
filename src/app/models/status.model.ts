export interface MonthStatus {
    mois: number;
    nom: string;
    paye: boolean;
    montant: number;
    contributionId?: number;
}

export interface MemberContributionStatus {
    memberId: number;
    nom: string;
    prenom: string;
    im: string;
    service: string;
    categorie: 'A' | 'B';
    montantMensuel: number;
    totalAnnuel: number;
    moisPayes: number;
    tauxPaiement: number;
    dernierPaiement?: string;
}
