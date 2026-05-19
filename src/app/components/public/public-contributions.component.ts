import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { SettingsService } from '../../services/settings.service';
import { SpaceNumberPipe } from '../../pipes/space-number.pipe';
import { LoadingIndicatorComponent } from '../shared/loading-indicator.component';
import { Contribution, Member, MemberContributionStatus } from '../../models';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

  // Statistiques globales
  totalMembres: number = 0;
  membresAJour: number = 0;
  tauxGlobal: number = 0;
  totalCollecte: number = 0;
  totalMoisPayes: number = 0;
  isLoading: boolean = false;

  constructor(private supabase: SupabaseService, private settingsService: SettingsService) {
    // Générer les 7 années à partir de 2026
    const startYear = 2026;
    const endYear = startYear + 7
    for (let year = startYear; year <= endYear; year++) {
      this.annees.push(year);
    }
    this.annees.sort();
    this.annees.sort();
  }

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.isLoading = true;
    try {
      const membres = await this.supabase.getMembers();
      const contributions = await this.supabase.getContributionsByYear(this.anneeSelectionnee);

      // Calculer le statut pour chaque membre
      this.membres = membres.map((member: any) => {
        const cotisationsMembre = contributions.filter((c: any) => c.member_id === member.id);
        const moisPayes = cotisationsMembre.length;
        const montantMensuel = this.settingsService.getMontantCotisation(member.categorie);
        const totalAnnuel = moisPayes * montantMensuel;
        const tauxPaiement = Math.round((moisPayes / 12) * 100);

        // Trouver le dernier paiement
        let dernierPaiement = undefined;
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

      // Calculer les statistiques globales
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

    // Filtre par recherche
    if (this.filtreRecherche && this.filtreRecherche.trim() !== '') {
      const recherche = this.filtreRecherche.toLowerCase().trim();
      resultats = resultats.filter(m =>
        m.nom.toLowerCase().includes(recherche) ||
        m.prenom.toLowerCase().includes(recherche) ||
        m.im.toLowerCase().includes(recherche)
      );
    }

    // Filtre par statut
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
    const headers = ['IM', 'Nom', 'Prénom', 'Service', 'Catégorie', 'Mois payés', 'Taux (%)', 'Total Annuel (Ar)'];
    const rows = this.membresFiltres.map(m => [
      m.im,
      m.nom,
      m.prenom,
      m.service || '',
      m.categorie,
      `${m.moisPayes}/12`,
      m.tauxPaiement,
      m.totalAnnuel
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

  async exportAsImage() {
    if (!this.exportPage) return;

    try {
      const element = this.exportPage.nativeElement;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
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
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = pdf.internal.pageSize.getWidth() - 10;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 5;

      // Ajouter le titre
      pdf.setFontSize(14);
      pdf.text(`État des cotisations - Année ${this.anneeSelectionnee}`, 5, position);
      position += 10;

      // Ajouter la date
      pdf.setFontSize(10);
      pdf.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 5, position);
      position += 8;

      // Ajouter l'image du tableau
      pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      // Ajouter des pages si nécessaire
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      const timestamp = new Date().toISOString().split('T')[0];
      pdf.save(`cotisations_${this.anneeSelectionnee}_${timestamp}.pdf`);
    } catch (error) {
      console.error('Erreur export PDF:', error);
      alert('Erreur lors de l\'export en PDF');
    }
  }
}
