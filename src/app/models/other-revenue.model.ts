export interface OtherRevenue {
    id: number;
    date: string;
    libelle: string;
    montant: number;
    categorie?: string;
    category_id?: number | null;
}

export type OtherRevenueForm = Omit<OtherRevenue, 'id'>;
