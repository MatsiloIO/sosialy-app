export interface Contribution {
  id: number;
  member_id: number;
  date: string;
  montant: number;
  mois_reference: string;
  paiement_method: string;
  annee: number;
  mois: number;
}

export type ContributionForm = Omit<Contribution, 'id'>;
