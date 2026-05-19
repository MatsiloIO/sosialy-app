export interface Member {
    id: number;
    nom: string;
    prenom: string;
    im: string;
    service: string;
    categorie: 'A' | 'B';
}

export type MemberForm = Omit<Member, 'id'>;
