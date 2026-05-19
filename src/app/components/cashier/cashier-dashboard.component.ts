import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { SpaceNumberPipe } from '../../pipes/space-number.pipe';
import { LoadingIndicatorComponent } from '../shared/loading-indicator.component';
import { Expense, ExpenseForm, OtherRevenue, OtherRevenueForm } from '../../models';

@Component({
  selector: 'app-cashier-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SpaceNumberPipe, LoadingIndicatorComponent],
  templateUrl: './cashier-dashboard.component.html',
  styleUrls: ['./cashier-dashboard.component.css']
})
export class CashierDashboardComponent implements OnInit {
  activeTab = 'depenses';

  // Données
  totalRecettes = 0;
  totalCotisations = 0;
  totalOtherRevenues = 0;
  totalDepenses = 0;
  solde = 0;

  expenses: Expense[] = [];
  revenues: OtherRevenue[] = [];
  revenuesPage: OtherRevenue[] = [];
  revenueCurrentPage = 1;
  revenueItemsPerPage = 5;
  revenueTotalPages = 1;

  totalDepensesListe = 0;
  totalRecettesListe = 0;

  depensesParCategorie: { [key: string]: number } = {};
  evolutionMensuelle: any[] = [];

  // États de chargement
  loading = {
    recettes: true,
    depenses: true,
    solde: true,
    depensesListe: true,
    recettesListe: true,
    graphiques: true,
    actions: false
  };

  expenseForm: ExpenseForm = { date: '', libelle: '', montant: 0 };
  revenueForm: OtherRevenueForm = { date: '', libelle: '', montant: 0 };

  // loaded from DB reference tables
  expenseCategories: Array<{ id: number; name: string }> = [];
  revenueCategories: Array<{ id: number; name: string }> = [];

  constructor(private supabase: SupabaseService) { }

  async ngOnInit() {
    await this.loadCategories();
    await this.loadAll();
  }

  async loadCategories() {
    try {
      this.expenseCategories = await this.supabase.getExpenseCategories();
      this.revenueCategories = await this.supabase.getRevenueCategories();

      // set sensible defaults for forms
      if (!this.expenseForm['category_id'] && this.expenseCategories.length) {
        (this.expenseForm as any).category_id = this.expenseCategories[0].id;
      }
      if (!this.revenueForm['category_id'] && this.revenueCategories.length) {
        (this.revenueForm as any).category_id = this.revenueCategories[0].id;
      }
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
    }
  }

  async loadAll() {
    await Promise.all([
      this.loadBalance(),
      this.loadExpenses(),
      this.loadRevenues()
    ]);
    await this.loadGraphiques();
  }

  async loadBalance() {
    this.loading.recettes = true;
    this.loading.depenses = true;
    this.loading.solde = true;

    try {
      const balance = await this.supabase.getBalance();
      this.totalRecettes = balance.totalRecettes;
      this.totalDepenses = balance.totalDepenses;
      this.solde = balance.solde;

      // Détail des recettes
      this.totalCotisations = await this.supabase.getTotalContributions();
      this.totalOtherRevenues = await this.supabase.getTotalOtherRevenues();
    } catch (error) {
      console.error('Erreur chargement balance:', error);
    } finally {
      this.loading.recettes = false;
      this.loading.depenses = false;
      this.loading.solde = false;
    }
  }

  async loadExpenses() {
    this.loading.depensesListe = true;

    try {
      this.expenses = await this.supabase.getExpenses();
      this.totalDepensesListe = this.expenses.reduce((sum, e) => sum + e.montant, 0);
    } catch (error) {
      console.error('Erreur chargement dépenses:', error);
    } finally {
      this.loading.depensesListe = false;
    }
  }

  async loadRevenues() {
    this.loading.recettesListe = true;

    try {
      this.revenues = await this.supabase.getOtherRevenues();
      this.totalRecettesListe = this.revenues.reduce((sum, r) => sum + r.montant, 0);
      this.updateRevenuePagination();
    } catch (error) {
      console.error('Erreur chargement recettes:', error);
    } finally {
      this.loading.recettesListe = false;
    }
  }

  async loadGraphiques() {
    this.loading.graphiques = true;

    try {
      // Analyse par catégorie de dépenses (utilise category_id si présent)
      this.depensesParCategorie = {};
      this.expenses.forEach(expense => {
        const catName = this.getCategoryName(expense, 'expense');
        if (!this.depensesParCategorie[catName]) {
          this.depensesParCategorie[catName] = 0;
        }
        this.depensesParCategorie[catName] += expense.montant;
      });

      // Évolution mensuelle (3 derniers mois)
      const aujourdhui = new Date();
      this.evolutionMensuelle = [];

      for (let i = 2; i >= 0; i--) {
        const date = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - i, 1);
        const moisNom = date.toLocaleString('fr', { month: 'long' });
        const annee = date.getFullYear();

        const recettesMois = this.revenues.filter(r => {
          const rDate = new Date(r.date);
          return rDate.getMonth() === date.getMonth() && rDate.getFullYear() === annee;
        }).reduce((sum, r) => sum + r.montant, 0);

        const depensesMois = this.expenses.filter(e => {
          const eDate = new Date(e.date);
          return eDate.getMonth() === date.getMonth() && eDate.getFullYear() === annee;
        }).reduce((sum, e) => sum + e.montant, 0);

        this.evolutionMensuelle.push({
          mois: moisNom,
          recettes: recettesMois,
          depenses: depensesMois
        });
      }
    } catch (error) {
      console.error('Erreur chargement graphiques:', error);
    } finally {
      this.loading.graphiques = false;
    }
  }

  async addExpense() {
    if (!this.expenseForm.date || !this.expenseForm.libelle || this.expenseForm.montant <= 0) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    this.loading.actions = true;

    try {
      await this.supabase.addExpense(this.expenseForm);
      this.expenseForm = { date: '', libelle: '', montant: 0, category_id: this.expenseCategories[0]?.id } as any;
      await this.loadExpenses();
      await this.loadBalance();
      await this.loadGraphiques();
    } catch (error) {
      console.error('Erreur ajout dépense:', error);
      alert('Erreur lors de l\'ajout');
    } finally {
      this.loading.actions = false;
    }
  }

  async addRevenue() {
    if (!this.revenueForm.date || !this.revenueForm.libelle || this.revenueForm.montant <= 0) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    this.loading.actions = true;

    try {
      await this.supabase.addOtherRevenue(this.revenueForm);
      this.revenueForm = { date: '', libelle: '', montant: 0, category_id: this.revenueCategories[0]?.id } as any;
      await this.loadRevenues();
      await this.loadBalance();
      await this.loadGraphiques();
    } catch (error) {
      console.error('Erreur ajout recette:', error);
      alert('Erreur lors de l\'ajout');
    } finally {
      this.loading.actions = false;
    }
  }

  async deleteExpense(id: number) {
    if (!confirm('Supprimer cette dépense ?')) return;

    this.loading.actions = true;

    try {
      await this.supabase.deleteExpense(id);
      await this.loadExpenses();
      await this.loadBalance();
      await this.loadGraphiques();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    } finally {
      this.loading.actions = false;
    }
  }

  async deleteRevenue(id: number) {
    if (!confirm('Supprimer cette recette ?')) return;

    this.loading.actions = true;

    try {
      await this.supabase.deleteOtherRevenue(id);
      await this.loadRevenues();
      await this.loadBalance();
      await this.loadGraphiques();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    } finally {
      this.loading.actions = false;
    }
  }

  updateRevenuePagination() {
    this.revenueTotalPages = Math.max(1, Math.ceil(this.revenues.length / this.revenueItemsPerPage));
    if (this.revenueCurrentPage > this.revenueTotalPages) {
      this.revenueCurrentPage = this.revenueTotalPages;
    }
    const start = (this.revenueCurrentPage - 1) * this.revenueItemsPerPage;
    this.revenuesPage = this.revenues.slice(start, start + this.revenueItemsPerPage);
  }

  changeRevenuePage(page: number) {
    if (page < 1 || page > this.revenueTotalPages) return;
    this.revenueCurrentPage = page;
    this.updateRevenuePagination();
  }

  getRevenuePageNumbers(): number[] {
    return Array.from({ length: this.revenueTotalPages }, (_, index) => index + 1);
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'graphiques') {
      this.loadGraphiques();
    }
  }

  getCategoryName(item: any, type: 'expense' | 'revenue' = 'expense'): string {
    // If legacy text exists, prefer it
    if (item.categorie) return item.categorie;
    const id = item.category_id ?? item.category_id;
    const list = type === 'expense' ? this.expenseCategories : this.revenueCategories;
    const found = list.find(c => c.id === id);
    return found?.name ?? '—';
  }
}