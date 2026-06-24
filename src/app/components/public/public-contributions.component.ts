// src/app/components/public/public-contributions.component.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { SettingsService } from '../../services/settings.service';
import { TokenService } from '../../services/token.service';
import { AuditService } from '../../services/audit.service';
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
  totalTokens?: number;
  tokensPayes?: number;
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
  totalTokensAll: number = 0;
  totalTokensPayesAll: number = 0;
  isLoading: boolean = false;

  userRole: string = 'visitor';
  isAdmin: boolean = false;

  constructor(
    private supabase: SupabaseService,
    private settingsService: SettingsService,
    private tokenService: TokenService,
    private auditService: AuditService,
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
      const tokenSummaries = await this.tokenService.getMemberTokenSummary();

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

        const tokenSummary = tokenSummaries.find((s: any) => s.member_id === member.id);

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
          dernierPaiement: dernierPaiement,
          totalTokens: tokenSummary ? tokenSummary.total_tokens : 0,
          tokensPayes: tokenSummary ? tokenSummary.tokens_payes : 0
        };
      });

      this.totalMembres = this.membres.length;
      this.membresAJour = this.membres.filter(m => m.tauxPaiement === 100).length;
      this.totalCollecte = this.membres.reduce((sum, m) => sum + m.totalAnnuel, 0);
      this.totalMoisPayes = this.membres.reduce((sum, m) => sum + m.moisPayes, 0);
      // tokens totals
      this.totalTokensAll = this.membres.reduce((sum, m) => sum + (m.totalTokens || 0), 0);
      this.totalTokensPayesAll = this.membres.reduce((sum, m) => sum + (m.tokensPayes || 0), 0);
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

    const headers = ['IM', 'Nom', 'Prénom', 'Service', 'Catégorie', 'Montant/mois', 'Mois payés', 'Tokens payés', 'Taux (%)', 'Total Annuel (Ar)', 'Statut'];
    const rows = this.membresFiltres.map(m => [
      m.im,
      m.nom,
      m.prenom,
      m.service || '',
      m.categorie,
      (m.montantMensuel || 0).toString(),
      `${m.moisPayes}/12`,
      `${m.tokensPayes || 0}/${m.totalTokens || 0}`,
      m.tauxPaiement.toString(),
      m.totalAnnuel.toString(),
      (m.tauxPaiement === 100 ? 'À jour' : (m.tauxPaiement > 0 ? 'Partiel' : 'Aucune'))
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
    // log action
    this.auditService.log('export_csv', { year: this.anneeSelectionnee, rows: rows.length });
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
      'Tokens payés': `${m.tokensPayes || 0}/${m.totalTokens || 0}`,
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
      'Tokens payés': `${this.membres.reduce((s, m) => s + (m.tokensPayes || 0), 0)}/${this.membres.reduce((s, m) => s + (m.totalTokens || 0), 0)}`,
      'Dernier paiement': '',
      'Statut': `${this.membresAJour}/${this.totalMembres} membres à jour`
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    ws['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
      { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 10 },
      { wch: 14 }, { wch: 18 }, { wch: 15 }, { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, `Cotisations_${this.anneeSelectionnee}`);
    XLSX.writeFile(wb, `cotisations_${this.anneeSelectionnee}_${new Date().toISOString().split('T')[0]}.xlsx`);
    this.auditService.log('export_excel', { year: this.anneeSelectionnee, rows: this.membresFiltres.length });
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
      const element = this.exportPage.nativeElement as HTMLElement;

      // Preserve original styles to restore later
      const originalWidth = element.style.width || '';
      const originalHeight = element.style.height || '';
      const originalOverflow = element.style.overflow || '';

      // Expand element to its full scroll size so html2canvas captures all content
      element.style.width = element.scrollWidth + 'px';
      element.style.height = element.scrollHeight + 'px';
      element.style.overflow = 'visible';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });

      // restore styles
      element.style.width = originalWidth;
      element.style.height = originalHeight;
      element.style.overflow = originalOverflow;

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10; // mm

      // Calculate image widths/heights and how many px correspond to one PDF page height
      const imgWidthMM = pageWidth - margin * 2;
      const pxPerMm = canvas.width / imgWidthMM;
      const sliceHeightPx = Math.floor(pageHeight * pxPerMm);

      let yPx = 0;
      let pageIndex = 0;

      while (yPx < canvas.height) {
        const canvasSlice = document.createElement('canvas');
        canvasSlice.width = canvas.width;
        const remaining = canvas.height - yPx;
        canvasSlice.height = remaining > sliceHeightPx ? sliceHeightPx : remaining;
        const ctx = canvasSlice.getContext('2d');
        if (!ctx) throw new Error('Impossible d\'obtenir le contexte canvas');
        ctx.drawImage(canvas, 0, yPx, canvas.width, canvasSlice.height, 0, 0, canvasSlice.width, canvasSlice.height);

        const imgData = canvasSlice.toDataURL('image/png');
        const imgHeightMM = canvasSlice.height / pxPerMm;

        if (pageIndex > 0) pdf.addPage();
        // Add header on first page
        if (pageIndex === 0) {
          let yPos = margin - 2;
          pdf.setFontSize(14);
          pdf.text(`État des cotisations - Année ${this.anneeSelectionnee}`, margin, yPos + 6);
          pdf.setFontSize(10);
          pdf.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, margin, yPos + 12);
          // place image below header
          pdf.addImage(imgData, 'PNG', margin, margin + 12, imgWidthMM, imgHeightMM);
        } else {
          pdf.addImage(imgData, 'PNG', margin, margin, imgWidthMM, imgHeightMM);
        }

        yPx += canvasSlice.height;
        pageIndex++;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      pdf.save(`cotisations_${this.anneeSelectionnee}_${timestamp}.pdf`);
      this.auditService.log('export_pdf', { year: this.anneeSelectionnee, pages: pageIndex });
    } catch (error) {
      console.error('Erreur export PDF:', error);
      alert('Erreur lors de l\'export en PDF');
    }
  }
}