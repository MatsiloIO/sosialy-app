// src/app/components/tokens/token-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TokenService } from '../../services/token.service';
import { AuthService } from '../../services/auth.service';
import { MemberTokenSummary, TokenStats } from '../../models/token.models';
import { SpaceNumberPipe } from '../../pipes/space-number.pipe';
import { LoadingIndicatorComponent } from '../shared/loading-indicator.component';

@Component({
  selector: 'app-token-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SpaceNumberPipe, LoadingIndicatorComponent],
  templateUrl: './token-dashboard.component.html',
  styleUrls: ['./token-dashboard.component.css']
})
export class TokenDashboardComponent implements OnInit {
  stats: TokenStats = {
    total_attribues: 0,
    total_payes: 0,
    total_impayes: 0,
    montant_total: 0,
    montant_paye: 0,
    montant_impaye: 0,
    taux_paiement: 0
  };

  memberSummaries: MemberTokenSummary[] = [];
  filteredSummaries: MemberTokenSummary[] = [];
  searchTerm: string = '';
  isLoading = false;

  userRole: string = '';
  isAdmin = false;
  canEdit = false;

  constructor(
    private tokenService: TokenService,
    private authService: AuthService
  ) { }

  async ngOnInit() {
    await this.loadUserRole();
    await this.loadData();
  }

  async loadUserRole() {
    this.userRole = this.authService.getCurrentRole();
    this.isAdmin = this.authService.isAdmin();
    this.canEdit = this.authService.canEdit();
  }

  async loadData() {
    this.isLoading = true;
    try {
      this.stats = await this.tokenService.getTokenStats();
      this.memberSummaries = await this.tokenService.getMemberTokenSummary();
      this.filteredSummaries = [...this.memberSummaries];
    } catch (error) {
      console.error('Erreur chargement données:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      this.isLoading = false;
    }
  }

  applyFilter() {
    if (!this.searchTerm) {
      this.filteredSummaries = [...this.memberSummaries];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredSummaries = this.memberSummaries.filter(m =>
        m.nom.toLowerCase().includes(term) ||
        m.prenom.toLowerCase().includes(term) ||
        m.im.toLowerCase().includes(term)
      );
    }
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilter();
  }
}