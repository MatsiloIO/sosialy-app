// src/app/components/contributions/monthly-contributions.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { SettingsService } from '../../services/settings.service';
import { SpaceNumberPipe } from '../../pipes/space-number.pipe';
import { LoadingIndicatorComponent } from '../shared/loading-indicator.component';
import { Contribution, Member, MonthStatus } from '../../models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-monthly-contributions',
  standalone: true,
  imports: [CommonModule, FormsModule, SpaceNumberPipe, LoadingIndicatorComponent],
  templateUrl: './monthly-contributions.component.html',
  styleUrls: ['./monthly-contributions.component.css']
})
export class MonthlyContributionsComponent implements OnInit {
  membres: Member[] = [];
  membresFiltres: Member[] = [];
  membresPages: Member[] = [];
  membreSelectionne: number | null = null;

  // Filtre et pagination
  filtreRecherche: string = '';
  itemsPerPage: number = 10;
  currentPage: number = 1;
  totalPages: number = 1;

  // Gestion des cotisations
  anneeSelectionnee: number = new Date().getFullYear();
  annees: number[] = [];
  moisStatus: MonthStatus[] = [];
  isLoading: boolean = false;

  // Paiement groupé
  nbMoisAGrouper: number = 0;
  selectedMois: number[] = [];

  // Rôle utilisateur
  userRole: string = 'visitor';
  canEdit = false;
  isAdmin = false;

  private contributionsExistantes: Contribution[] = [];

  Math = Math;

  constructor(
    private supabase: SupabaseService,
    private settingsService: SettingsService,
    private authService: AuthService
  ) {
    const startYear = 2026;
    const endYear = startYear + 7;
    for (let year = startYear; year <= endYear; year++) {
      this.annees.push(year);
    }
    this.annees.sort();
  }

  async ngOnInit() {
    await this.loadUserRole();
    this.itemsPerPage = this.settingsService.getSavedPageSize('pagination.pageSize.contributions', 10);
    await this.loadMembers();
  }

  async loadUserRole() {
    this.userRole = this.authService.getCurrentRole();
    this.canEdit = this.authService.canEdit();
    this.isAdmin = this.authService.isAdmin();
    console.log('👤 Rôle utilisateur dans cotisations:', this.userRole, 'canEdit:', this.canEdit);
  }

  async loadMembers() {
    try {
      this.isLoading = true;
      this.membres = await this.supabase.getMembers();
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
        membre.im.toLowerCase().includes(recherche)
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
    this.settingsService.savePageSize('pagination.pageSize.contributions', this.itemsPerPage);
  }

  onFiltreChange() {
    this.applyFiltre();
  }

  clearFiltre() {
    this.filtreRecherche = '';
    this.applyFiltre();
  }

  async selectMember(member: Member) {
    this.membreSelectionne = member.id;
    this.selectedMois = [];
    this.nbMoisAGrouper = 0;
    await this.loadMonthlyStatus();
  }

  async onAnneeChange() {
    if (this.membreSelectionne) {
      this.selectedMois = [];
      this.nbMoisAGrouper = 0;
      await this.loadMonthlyStatus();
    }
  }

  async loadMonthlyStatus() {
    if (!this.membreSelectionne) return;

    try {
      this.isLoading = true;

      this.contributionsExistantes = await this.supabase.getContributionsByMemberAndYear(
        this.membreSelectionne,
        this.anneeSelectionnee
      );

      const moisNoms = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
      ];

      const montantMensuel = this.getMontantMensuel();

      this.moisStatus = moisNoms.map((nom, index) => {
        const moisNumero = index + 1;
        const contribution = this.contributionsExistantes.find(c => c.mois === moisNumero);

        return {
          mois: moisNumero,
          nom: nom,
          paye: !!contribution,
          montant: montantMensuel,
          contributionId: contribution?.id
        };
      });

    } catch (error) {
      console.error('Erreur chargement statut mensuel:', error);
      alert('Erreur lors du chargement des cotisations');
    } finally {
      this.isLoading = false;
    }
  }

  toggleSelectMois(mois: MonthStatus) {
    // ✅ Vérification des droits
    if (!this.canEdit) {
      alert('Vous n\'avez pas les droits pour modifier les cotisations');
      return;
    }
    if (mois.paye) return;

    const index = this.selectedMois.indexOf(mois.mois);
    if (index === -1) {
      this.selectedMois.push(mois.mois);
    } else {
      this.selectedMois.splice(index, 1);
    }
  }

  isMoisSelected(mois: MonthStatus): boolean {
    return !mois.paye && this.selectedMois.includes(mois.mois);
  }

  selectionnerTous() {
    if (!this.canEdit) {
      alert('Vous n\'avez pas les droits pour modifier les cotisations');
      return;
    }
    this.selectedMois = this.moisStatus
      .filter(m => !m.paye)
      .map(m => m.mois);
  }

  deselectionnerTous() {
    if (!this.canEdit) {
      alert('Vous n\'avez pas les droits pour modifier les cotisations');
      return;
    }
    this.selectedMois = [];
  }

  async paiementGroupe() {
    // ✅ Vérification des droits
    if (!this.canEdit) {
      alert('Vous n\'avez pas les droits pour effectuer des paiements');
      return;
    }

    if (this.nbMoisAGrouper <= 0) {
      alert('Veuillez sélectionner un nombre de mois');
      return;
    }

    const moisNonPayes = this.moisStatus
      .filter(m => !m.paye)
      .sort((a, b) => a.mois - b.mois);

    if (moisNonPayes.length === 0) {
      alert('Tous les mois sont déjà payés !');
      return;
    }

    const moisAPayer = moisNonPayes.slice(0, this.nbMoisAGrouper);

    if (moisAPayer.length < this.nbMoisAGrouper) {
      const confirmation = confirm(`Il ne reste que ${moisAPayer.length} mois à payer. Voulez-vous les payer ?`);
      if (!confirmation) return;
    }

    const totalMontant = moisAPayer.reduce((sum, m) => sum + m.montant, 0);
    const moisNoms = moisAPayer.map(m => m.nom).join(', ');

    const confirmation = confirm(
      `📋 Paiement groupé pour :\n${moisNoms}\n\n` +
      `💰 Total : ${this.spaceNumber(totalMontant)} Ar\n\n` +
      `✅ Confirmer le paiement ?`
    );

    if (confirmation) {
      await this.effectuerPaiementsMultiples(moisAPayer);
    }
  }

  async paiementSelectionMultiple() {
    // ✅ Vérification des droits
    if (!this.canEdit) {
      alert('Vous n\'avez pas les droits pour effectuer des paiements');
      return;
    }

    if (this.selectedMois.length === 0) {
      alert('Veuillez sélectionner au moins un mois');
      return;
    }

    const moisAPayer = this.moisStatus.filter(m => this.selectedMois.includes(m.mois));
    const totalMontant = moisAPayer.reduce((sum, m) => sum + m.montant, 0);
    const moisNoms = moisAPayer.map(m => m.nom).join(', ');

    const confirmation = confirm(
      `📋 Paiement des mois sélectionnés :\n${moisNoms}\n\n` +
      `💰 Total : ${this.spaceNumber(totalMontant)} Ar\n\n` +
      `✅ Confirmer le paiement ?`
    );

    if (confirmation) {
      await this.effectuerPaiementsMultiples(moisAPayer);
      this.selectedMois = [];
    }
  }

  async effectuerPaiementsMultiples(moisAPayer: MonthStatus[]) {
    const membre = this.membres.find(m => m.id === this.membreSelectionne);
    if (!membre || this.membreSelectionne === null) return;
    const memberId = this.membreSelectionne;

    try {
      this.isLoading = true;

      for (const mois of moisAPayer) {
        const datePaiement = new Date(this.anneeSelectionnee, mois.mois - 1, 15);
        const moisReference = `${mois.nom} ${this.anneeSelectionnee}`;

        const contribution = {
          member_id: memberId,
          date: datePaiement.toISOString().split('T')[0],
          montant: mois.montant,
          mois_reference: moisReference,
          paiement_method: 'especes',
          annee: this.anneeSelectionnee,
          mois: mois.mois
        };

        await this.supabase.addContribution(contribution);
      }

      alert(`✅ ${moisAPayer.length} cotisation(s) enregistrée(s) avec succès !\n💰 Total: ${this.spaceNumber(moisAPayer.reduce((sum, m) => sum + m.montant, 0))} Ar`);

      this.nbMoisAGrouper = 0;
      await this.loadMonthlyStatus();

    } catch (error) {
      console.error('Erreur lors du paiement groupé:', error);
      alert('❌ Erreur lors du paiement groupé');
    } finally {
      this.isLoading = false;
    }
  }

  async annulerPaiement(mois: MonthStatus) {
    // ✅ Vérification des droits (seul admin peut annuler selon les politiques)
    if (!this.isAdmin) {
      alert('Seul un administrateur peut annuler un paiement');
      return;
    }

    if (!mois.paye || !mois.contributionId) {
      alert('Impossible d\'annuler : paiement introuvable.');
      return;
    }

    const confirmation = confirm(`⚠️ Annuler le paiement de ${mois.nom} ${this.anneeSelectionnee} ? Cette action est irréversible.`);
    if (!confirmation) return;

    try {
      this.isLoading = true;
      await this.supabase.deleteContribution(mois.contributionId);
      alert('✅ Paiement annulé avec succès.');
      await this.loadMonthlyStatus();
    } catch (error) {
      console.error('Erreur annulation paiement :', error);
      alert('❌ Erreur lors de l\'annulation du paiement');
    } finally {
      this.isLoading = false;
    }
  }

  getMemberName(): string {
    const membre = this.membres.find(m => m.id === this.membreSelectionne);
    return membre ? `${membre.prenom} ${membre.nom}` : 'Aucun membre sélectionné';
  }

  getMemberCategorie(): string {
    const membre = this.membres.find(m => m.id === this.membreSelectionne);
    return membre ? membre.categorie : 'A';
  }

  getMontantMensuel(): number {
    const categorie = this.getMemberCategorie();
    return this.settingsService.getMontantCotisation(categorie);
  }

  getMontantGroupe(): number {
    if (this.nbMoisAGrouper <= 0) return 0;
    const montantMensuel = this.getMontantMensuel();
    return this.nbMoisAGrouper * montantMensuel;
  }

  getMontantSelection(): number {
    const moisSelectionnes = this.moisStatus.filter(m => this.selectedMois.includes(m.mois));
    return moisSelectionnes.reduce((sum, m) => sum + m.montant, 0);
  }

  getNbMoisPayes(): number {
    return this.moisStatus.filter(m => m.paye).length;
  }

  getNbMoisRestants(): number {
    return this.moisStatus.filter(m => !m.paye).length;
  }

  getTotalPaye(): number {
    return this.moisStatus.filter(m => m.paye).reduce((sum, m) => sum + m.montant, 0);
  }

  spaceNumber(value: number): string {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
}