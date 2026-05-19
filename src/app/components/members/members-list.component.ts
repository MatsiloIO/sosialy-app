import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { SettingsService } from '../../services/settings.service';
import { Member, MemberForm } from '../../models';
import { LoadingIndicatorComponent } from '../shared/loading-indicator.component';

@Component({
  selector: 'app-members-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingIndicatorComponent],
  templateUrl: './members-list.component.html',
  styleUrls: ['./members-list.component.css']
})
export class MembersListComponent implements OnInit {
  members: Member[] = [];
  membersPage: Member[] = [];
  filteredMembers: Member[] = [];
  filterText: string = '';
  filterCategory: 'all' | 'A' | 'B' = 'all';
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  formData: MemberForm = { nom: '', prenom: '', im: '', service: '', categorie: 'A' };
  editingMember: Member | null = null;
  isLoading: boolean = false;

  constructor(private supabase: SupabaseService, private settingsService: SettingsService) {
    this.pageSize = this.settingsService.getSavedPageSize('pagination.pageSize.members', 10);
  }

  async ngOnInit() {
    await this.loadMembers();
  }

  async loadMembers() {
    this.isLoading = true;
    try {
      this.members = await this.supabase.getMembers();
      this.applyFilter();
    } finally {
      this.isLoading = false;
    }
  }

  async saveMember() {
    if (this.editingMember) {
      await this.supabase.updateMember(this.editingMember.id, this.formData);
    } else {
      await this.supabase.addMember(this.formData);
    }
    this.resetForm();
    await this.loadMembers();
  }

  editMember(member: any) {
    this.editingMember = member;
    this.formData = { ...member };
  }

  cancelEdit() {
    this.resetForm();
  }

  async deleteMember(id: number) {
    if (confirm('Supprimer ce membre ?')) {
      await this.supabase.deleteMember(id);
      await this.loadMembers();
    }
  }

  applyFilter() {
    let results = [...this.members];

    if (this.filterText && this.filterText.trim() !== '') {
      const query = this.filterText.toLowerCase().trim();
      results = results.filter(member =>
        member.nom.toLowerCase().includes(query) ||
        member.prenom.toLowerCase().includes(query) ||
        member.im.toLowerCase().includes(query) ||
        member.service.toLowerCase().includes(query)
      );
    }

    if (this.filterCategory !== 'all') {
      results = results.filter(member => member.categorie === this.filterCategory);
    }

    this.filteredMembers = results;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredMembers.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    const start = (this.currentPage - 1) * this.pageSize;
    this.membersPage = this.filteredMembers.slice(start, start + this.pageSize);
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
    this.updatePagination();
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.updatePagination();
    this.settingsService.savePageSize('pagination.pageSize.members', this.pageSize);
  }

  getPageArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, idx) => idx + 1);
  }

  resetForm() {
    this.formData = { nom: '', prenom: '', im: '', service: '', categorie: 'A' };
    this.editingMember = null;
  }
}