export interface Expense {
    id: number;
    date: string;
    libelle: string;
    montant: number;
    categorie?: string;
    category_id?: number | null;
}

export type ExpenseForm = Omit<Expense, 'id'>;
