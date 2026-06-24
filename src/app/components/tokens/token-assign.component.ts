// src/app/components/tokens/token-assign.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TokenService } from '../../services/token.service';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';
import { SpaceNumberPipe } from '../../pipes/space-number.pipe';
import { LoadingIndicatorComponent } from '../shared/loading-indicator.component';
import { Member } from '../../models';


@Component({
    selector: 'app-token-assign',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, SpaceNumberPipe],
    templateUrl: './token-assign.component.html',
    styleUrls: ['./token-assign.component.css']
})
export class TokenAssignComponent implements OnInit {
    // Liste des membres
    membres: Member[] = [];
    membresFiltres: Member[] = [];
    membresPages: Member[] = [];

    // Filtre et pagination
    filtreRecherche: string = '';
    itemsPerPage: number = 10;
    currentPage: number = 1;
    totalPages: number = 1;

    // Membre sélectionné
    membreSelectionne: Member | null = null;

    // Types de jetons
    tokenTypes: any[] = [];
    selectedTokenTypeId: number = 0;
    tokenQuantity: number = 1;
    selectedAttributionDate: string = new Date().toISOString().split('T')[0];

    // États
    isLoading = false;
    canEdit = false;
    isAdmin = false;
    errorMessage = '';
    successMessage = '';

    Math = Math;

    constructor(
        private supabase: SupabaseService,
        private tokenService: TokenService,
        private authService: AuthService,
        private router: Router
    ) { }

    async ngOnInit() {
        await this.loadUserRole();
        await this.loadTokenTypes();
        await this.loadMembers();
    }

    async loadUserRole() {
        this.canEdit = this.authService.canEdit();
        this.isAdmin = this.authService.isAdmin();

        if (!this.canEdit) {
            this.router.navigate(['/tokens']);
        }
    }

    async loadTokenTypes() {
        this.tokenTypes = await this.tokenService.getTokenTypes();
        if (this.tokenTypes.length > 0) {
            this.selectedTokenTypeId = this.tokenTypes[0].id;
        }
    }

    async loadMembers() {
        try {
            this.isLoading = true;
            const { data, error } = await this.supabase.supabase
                .from('members')
                .select('id, nom, prenom, im, service, categorie')
                .order('nom');

            if (error) throw error;
            this.membres = data || [];
            this.applyFiltre();
        } catch (error) {
            console.error('Erreur chargement membres:', error);
            alert('Erreur lors du chargement des membres');
        } finally {
            this.isLoading = false;
        }
    }

    applyFiltre() {
        if (!this.filtreRecherche || this.filtreRecherche.trim() === '') {
            this.membresFiltres = [...this.membres];
        } else {
            const recherche = this.filtreRecherche.toLowerCase().trim();
            this.membresFiltres = this.membres.filter(membre =>
                membre.nom.toLowerCase().includes(recherche) ||
                membre.prenom.toLowerCase().includes(recherche) ||
                membre.im.toLowerCase().includes(recherche) ||
                membre.service?.toLowerCase().includes(recherche)
            );
        }

        this.currentPage = 1;
        this.updatePagination();
    }

    updatePagination() {
        this.totalPages = Math.ceil(this.membresFiltres.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        this.membresPages = this.membresFiltres.slice(startIndex, endIndex);
    }

    changePage(page: number) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.updatePagination();
    }

    onItemsPerPageChange() {
        this.currentPage = 1;
        this.updatePagination();
    }

    onFiltreChange() {
        this.applyFiltre();
    }

    clearFiltre() {
        this.filtreRecherche = '';
        this.applyFiltre();
    }

    selectMember(member: Member) {
        this.membreSelectionne = member;
        this.errorMessage = '';
        this.successMessage = '';
    }

    clearSelection() {
        this.membreSelectionne = null;
        this.tokenQuantity = 1;
    }

    getMontantTotal(): number {
        if (!this.membreSelectionne) return 0;
        const tokenType = this.tokenTypes.find(t => t.id === this.selectedTokenTypeId);
        const montantUnitaire = tokenType?.montant || 0;
        return montantUnitaire * this.tokenQuantity;
    }

    async assignTokens() {
        if (!this.membreSelectionne) {
            this.errorMessage = 'Veuillez sélectionner un membre';
            return;
        }

        if (this.selectedTokenTypeId === 0) {
            this.errorMessage = 'Veuillez sélectionner un type de jeton';
            return;
        }

        if (this.tokenQuantity < 1) {
            this.errorMessage = 'La quantité doit être au moins 1';
            return;
        }

        if (!this.selectedAttributionDate) {
            this.errorMessage = 'Veuillez sélectionner une date d\'attribution';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';
        this.successMessage = '';

        try {
            await this.tokenService.assignMultipleTokens(
                this.membreSelectionne.id,
                this.selectedTokenTypeId,
                this.tokenQuantity,
                this.selectedAttributionDate
            );

            this.successMessage = `${this.tokenQuantity} jeton(s) attribué(s) avec succès à ${this.membreSelectionne.prenom} ${this.membreSelectionne.nom} !`;

            // Option: rediriger après 2 secondes ou rester pour continuer
            setTimeout(() => {
                this.router.navigate(['/tokens']);
            }, 2000);
        } catch (error: any) {
            this.errorMessage = error.message || 'Erreur lors de l\'attribution';
        } finally {
            this.isLoading = false;
        }
    }
}