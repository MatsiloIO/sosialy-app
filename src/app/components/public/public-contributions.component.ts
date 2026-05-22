// src/app/components/public/public-contributions.component.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { SettingsService } from '../../services/settings.service';
import { SpaceNumberPipe } from '../../pipes/space-number.pipe';
import { LoadingIndicatorComponent } from '../shared/loading-indicator.component';
import { AuthService } from '../../services/auth.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

interface MemberContributionStatus {
  memberId: number;
  nom: string;
  prenom: string;
  im: string;
  service: string;
  categorie: string;
  montantMensuel: number;
  totalAnnuel: number;
  moisPayes: number;
  tauxPaiement: number;
  dernierPaiement?: string;
}

@Component({
  selector: 'app-public-contributions',
  standalone: true,
  imports: [CommonModule, FormsModule, SpaceNumberPipe, LoadingIndicatorComponent],
  templateUrl: './public-contributions.component.html',
  styleUrls: ['./public-contributions.component.css']
})
export class PublicContributionsComponent implements OnInit {
  @ViewChild('exportPage') exportPage!: ElementRef;

  membres: MemberContributionStatus[] = [];
  membresFiltres: MemberContributionStatus[] = [];
  anneeSelectionnee: number = new Date().getFullYear();
  annees: number[] = [];
  filtreRecherche: string = '';
  filtreStatut: string = 'tous';
  dateDerniereMAJ: Date = new Date();

  totalMembres: number = 0;
  membresAJour: number = 0;
  tauxGlobal: number = 0;
  totalCollecte: number = 0;
  totalMoisPayes: number = 0;
  isLoading: boolean = false;

  userRole: string = 'visitor';
  isAdmin: boolean = false;

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
    await this.loadData();
  }

  async loadUserRole() {
    this.userRole = this.authService.getCurrentRole();
    this.isAdmin = this.authService.isAdmin();
  }

  async loadData() {
    this.isLoading = true;
    try {
      const membres = await this.supabase.getMembers();
      const contributions = await this.supabase.getContributionsByYear(this.anneeSelectionnee);

      this.membres = membres.map((member: any) => {
        const cotisationsMembre = contributions.filter((c: any) => c.member_id === member.id);
        const moisPayes = cotisationsMembre.length;
        const montantMensuel = this.settingsService.getMontantCotisation(member.categorie);
        const totalAnnuel = moisPayes * montantMensuel;
        const tauxPaiement = Math.round((moisPayes / 12) * 100);

        let dernierPaiement: string | undefined = undefined;
        if (cotisationsMembre.length > 0) {
          const dernier = cotisationsMembre.sort((a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
          )[0];
          dernierPaiement = dernier.date;
        }

        return {
          memberId: member.id,
          nom: member.nom,
          prenom: member.prenom,
          im: member.im,
          service: member.service,
          categorie: member.categorie,
          montantMensuel: montantMensuel,
          totalAnnuel: totalAnnuel,
          moisPayes: moisPayes,
          tauxPaiement: tauxPaiement,
          dernierPaiement: dernierPaiement
        };
      });

      this.totalMembres = this.membres.length;
      this.membresAJour = this.membres.filter(m => m.tauxPaiement === 100).length;
      this.totalCollecte = this.membres.reduce((sum, m) => sum + m.totalAnnuel, 0);
      this.totalMoisPayes = this.membres.reduce((sum, m) => sum + m.moisPayes, 0);
      this.tauxGlobal = this.totalMembres > 0
        ? Math.round((this.totalMoisPayes / (this.totalMembres * 12)) * 100)
        : 0;

      this.dateDerniereMAJ = new Date();
      this.applyFiltre();

    } catch (error) {
      console.error('Erreur chargement données:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      this.isLoading = false;
    }
  }

  applyFiltre() {
    let resultats = [...this.membres];

    if (this.filtreRecherche && this.filtreRecherche.trim() !== '') {
      const recherche = this.filtreRecherche.toLowerCase().trim();
      resultats = resultats.filter(m =>
        m.nom.toLowerCase().includes(recherche) ||
        m.prenom.toLowerCase().includes(recherche) ||
        m.im.toLowerCase().includes(recherche)
      );
    }

    if (this.filtreStatut !== 'tous') {
      switch (this.filtreStatut) {
        case 'a_jour':
          resultats = resultats.filter(m => m.tauxPaiement === 100);
          break;
        case 'partiel':
          resultats = resultats.filter(m => m.tauxPaiement > 0 && m.tauxPaiement < 100);
          break;
        case 'aucun':
          resultats = resultats.filter(m => m.tauxPaiement === 0);
          break;
      }
    }

    this.membresFiltres = resultats;
  }

  clearFiltre() {
    this.filtreRecherche = '';
    this.applyFiltre();
  }

  exportToCSV() {
    if (!this.isAdmin) {
      alert('Accès refusé. Seuls les administrateurs peuvent exporter en CSV.');
      return;
    }

    const headers = ['IM', 'Nom', 'Prénom', 'Service', 'Catégorie', 'Mois payés', 'Taux (%)', 'Total Annuel (Ar)'];
    const rows = this.membresFiltres.map(m => [
      m.im,
      m.nom,
      m.prenom,
      m.service || '',
      m.categorie,
      `${m.moisPayes}/12`,
      m.tauxPaiement.toString(),
      m.totalAnnuel.toString()
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `cotisations_${this.anneeSelectionnee}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  exportToExcel() {
    if (!this.isAdmin) {
      alert('Accès refusé. Seuls les administrateurs peuvent exporter en Excel.');
      return;
    }

    const data = this.membresFiltres.map(m => ({
      'IM': m.im,
      'Nom': m.nom,
      'Prénom': m.prenom,
      'Service': m.service || '',
      'Catégorie': m.categorie,
      'Montant mensuel (Ar)': m.montantMensuel,
      'Mois payés': `${m.moisPayes}/12`,
      'Taux (%)': m.tauxPaiement,
      'Total annuel (Ar)': m.totalAnnuel,
      'Dernier paiement': m.dernierPaiement ? new Date(m.dernierPaiement).toLocaleDateString('fr-FR') : '-',
      'Statut': m.tauxPaiement === 100 ? 'À jour' : (m.tauxPaiement > 0 ? 'Partiel' : 'Aucune')
    }));

    data.push({
      'IM': '',
      'Nom': '📊 STATISTIQUES',
      'Prénom': '',
      'Service': '',
      'Catégorie': '',
      'Montant mensuel (Ar)': 0,
      'Mois payés': `${this.totalMoisPayes}/${this.totalMembres * 12}`,
      'Taux (%)': this.tauxGlobal,
      'Total annuel (Ar)': this.totalCollecte,
      'Dernier paiement': '',
      'Statut': `${this.membresAJour}/${this.totalMembres} membres à jour`
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    ws['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
      { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 10 },
      { wch: 18 }, { wch: 15 }, { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, `Cotisations_${this.anneeSelectionnee}`);
    XLSX.writeFile(wb, `cotisations_${this.anneeSelectionnee}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  async exportAsImage() {
    if (!this.exportPage) return;

    try {
      const element = this.exportPage.nativeElement;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.href = canvas.toDataURL('image/png');
      link.setAttribute('download', `cotisations_${this.anneeSelectionnee}_${timestamp}.png`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erreur export image:', error);
      alert('Erreur lors de l\'export en image');
    }
  }

  async exportAsPDF() {
    if (!this.exportPage) return;

    try {
      const element = this.exportPage.nativeElement;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = pdf.internal.pageSize.getWidth() - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let yPosition = 15;

      pdf.setFontSize(14);
      pdf.text(`État des cotisations - Année ${this.anneeSelectionnee}`, 10, yPosition);
      yPosition += 8;
      pdf.setFontSize(10);
      pdf.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 10, yPosition);
      yPosition += 10;
      pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight);

      const timestamp = new Date().toISOString().split('T')[0];
      pdf.save(`cotisations_${this.anneeSelectionnee}_${timestamp}.pdf`);
    } catch (error) {
      console.error('Erreur export PDF:', error);
      alert('Erreur lors de l\'export en PDF');
    }
  }
}