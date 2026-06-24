// src/app/components/tokens/member-tokens.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TokenService } from '../../services/token.service';
import { AuthService } from '../../services/auth.service';
import { SupabaseService } from '../../services/supabase.service';
import { MemberToken, TokenType } from '../../models/token.models';
import { SpaceNumberPipe } from '../../pipes/space-number.pipe';
import { LoadingIndicatorComponent } from '../shared/loading-indicator.component';

@Component({
  selector: 'app-member-tokens',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SpaceNumberPipe, LoadingIndicatorComponent],
  templateUrl: './member-tokens.component.html',
  styleUrls: ['./member-tokens.component.css']
})
export class MemberTokensComponent implements OnInit {
  memberId!: number;
  memberName: string = '';
  memberIM: string = '';

  tokens: MemberToken[] = [];
  tokenTypes: TokenType[] = [];
  filteredTokens: MemberToken[] = [];
  filterStatut: string = 'tous';

  // Formulaire attribution
  selectedTokenTypeId: number = 0;
  tokenQuantity: number = 1;
  attributionDate: string = new Date().toISOString().split('T')[0];
  showAssignForm = false;

  // Formulaire paiement
  selectedTokenIds: number[] = [];
  paymentDate: string = new Date().toISOString().split('T')[0];
  paymentMode: 'especes' | 'cheque' | 'virement' = 'especes';

  isLoading = false;
  canEdit = false;
  isAdmin = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tokenService: TokenService,
    private authService: AuthService,
    private supabase: SupabaseService
  ) { }

  async ngOnInit() {
    this.memberId = Number(this.route.snapshot.paramMap.get('id'));
    await this.loadUserRole();
    await this.loadMemberInfo();
    await this.loadTokenTypes();
    await this.loadTokens();
  }

  async loadUserRole() {
    this.canEdit = this.authService.canEdit();
    this.isAdmin = this.authService.isAdmin();
  }

  async loadMemberInfo() {
    const { data, error } = await this.supabase.supabase
      .from('members')
      .select('nom, prenom, im')
      .eq('id', this.memberId)
      .single();

    if (!error && data) {
      this.memberName = `${data.prenom} ${data.nom}`;
      this.memberIM = data.im;
    }
  }

  async loadTokenTypes() {
    this.tokenTypes = await this.tokenService.getTokenTypes();
    if (this.tokenTypes.length > 0) {
      this.selectedTokenTypeId = this.tokenTypes[0].id;
    }
  }

  async loadTokens() {
    this.isLoading = true;
    try {
      this.tokens = await this.tokenService.getMemberTokens(this.memberId);
      this.applyFilter();
    } catch (error) {
      console.error('Erreur chargement jetons:', error);
      alert('Erreur lors du chargement des jetons');
    } finally {
      this.isLoading = false;
    }
  }

  applyFilter() {
    if (this.filterStatut === 'tous') {
      this.filteredTokens = [...this.tokens];
    } else {
      this.filteredTokens = this.tokens.filter(t => t.statut === this.filterStatut);
    }
  }

  toggleAssignForm() {
    this.showAssignForm = !this.showAssignForm;
    if (!this.showAssignForm) {
      this.selectedTokenTypeId = this.tokenTypes[0]?.id || 0;
      this.tokenQuantity = 1;
    }
  }

  async assignTokens() {
    if (!this.canEdit) {
      alert('Vous n\'avez pas les droits pour attribuer des jetons');
      return;
    }

    if (this.selectedTokenTypeId === 0) {
      alert('Veuillez sélectionner un type de jeton');
      return;
    }

    if (this.tokenQuantity < 1) {
      alert('La quantité doit être au moins 1');
      return;
    }

    if (!this.attributionDate) {
      alert('Veuillez sélectionner une date d\'attribution');
      return;
    }

    this.isLoading = true;
    try {
      await this.tokenService.assignMultipleTokens(
        this.memberId,
        this.selectedTokenTypeId,
        this.tokenQuantity,
        this.attributionDate
      );
      alert(`${this.tokenQuantity} jeton(s) attribué(s) avec succès`);
      await this.loadTokens();
      this.toggleAssignForm();
    } catch (error) {
      console.error('Erreur attribution:', error);
      alert('Erreur lors de l\'attribution');
    } finally {
      this.isLoading = false;
    }
  }

  toggleTokenSelection(tokenId: number) {
    const index = this.selectedTokenIds.indexOf(tokenId);
    if (index === -1) {
      this.selectedTokenIds.push(tokenId);
    } else {
      this.selectedTokenIds.splice(index, 1);
    }
  }

  isTokenSelected(tokenId: number): boolean {
    return this.selectedTokenIds.includes(tokenId);
  }

  getSelectedTotal(): number {
    const selectedTokens = this.tokens.filter(t => this.selectedTokenIds.includes(t.id));
    return selectedTokens.reduce((sum, t) => sum + (t.montant || 0), 0);
  }

  async paySelectedTokens() {
    if (!this.canEdit) {
      alert('Vous n\'avez pas les droits pour effectuer des paiements');
      return;
    }

    if (this.selectedTokenIds.length === 0) {
      alert('Veuillez sélectionner au moins un jeton');
      return;
    }

    const total = this.getSelectedTotal();
    const confirmation = confirm(
      `Paiement de ${this.selectedTokenIds.length} jeton(s)\n` +
      `Montant total: ${total.toLocaleString()} Ar\n` +
      `Confirmer le paiement ?`
    );

    if (!confirmation) return;

    this.isLoading = true;
    try {
      await this.tokenService.payTokens({
        token_ids: this.selectedTokenIds,
        date_paiement: this.paymentDate,
        mode_paiement: this.paymentMode
      });
      alert('Paiement effectué avec succès');
      this.selectedTokenIds = [];
      await this.loadTokens();
    } catch (error) {
      console.error('Erreur paiement:', error);
      alert('Erreur lors du paiement');
    } finally {
      this.isLoading = false;
    }
  }

  async cancelToken(tokenId: number) {
    if (!this.isAdmin) {
      alert('Seul un administrateur peut supprimer des jetons');
      return;
    }

    const confirmation = confirm('⚠️ Supprimer définitivement ce jeton ? Cette action est irréversible.');
    if (!confirmation) return;

    this.isLoading = true;
    try {
      await this.tokenService.cancelToken(tokenId);
      alert('✅ Jeton supprimé avec succès');
      await this.loadTokens();
      // Nettoyer la sélection si le jeton supprimé était sélectionné
      this.selectedTokenIds = this.selectedTokenIds.filter(id => id !== tokenId);
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('❌ Erreur lors de la suppression');
    } finally {
      this.isLoading = false;
    }
  }

  getStatusBadgeClass(statut: string): string {
    switch (statut) {
      case 'paye': return 'bg-success';
      case 'en_attente': return 'bg-warning text-dark';
      case 'annule': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getStatusIcon(statut: string): string {
    switch (statut) {
      case 'paye': return 'fa-check-circle';
      case 'en_attente': return 'fa-clock';
      case 'annule': return 'fa-ban';
      default: return 'fa-question-circle';
    }
  }

  getStatusText(statut: string): string {
    switch (statut) {
      case 'paye': return 'Payé';
      case 'en_attente': return 'En attente';
      case 'annule': return 'Annulé';
      default: return statut;
    }
  }

  viewRevenue(token: MemberToken) {
    if (token.revenue_id) {
      this.router.navigate(['/cashier'], { queryParams: { revenue_id: token.revenue_id } });
    }
  }
}