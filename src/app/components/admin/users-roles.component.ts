// src/app/components/admin/users-roles.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-users-roles',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="users-roles-container">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2 class="mb-0">
                    <i class="fa-solid fa-users-gear me-2"></i>
                    Gestion des utilisateurs
                </h2>
                <button class="btn btn-outline-secondary btn-sm" (click)="loadUsers()" [disabled]="loading">
                    <i class="fa-solid fa-rotate-right me-1"></i>
                    Rafraîchir
                </button>
            </div>

            <!-- Loading state -->
            <div *ngIf="loading" class="card p-5 text-center">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
                <p class="text-muted mb-0">Chargement des utilisateurs...</p>
            </div>

            <!-- Error state -->
            <div *ngIf="!loading && errorMessage" class="alert alert-warning">
                <i class="fa-solid fa-triangle-exclamation me-2"></i>
                {{ errorMessage }}
            </div>

            <!-- Users table -->
            <div *ngIf="!loading && !errorMessage" class="card">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead>
                            <tr>
                                <th><i class="fa-solid fa-envelope me-2"></i>Email</th>
                                <th><i class="fa-solid fa-tag me-2"></i>Rôle actuel</th>
                                <th><i class="fa-solid fa-pen me-2"></i>Attribuer un rôle</th>
                                <th><i class="fa-solid fa-floppy-disk me-2"></i>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr *ngFor="let user of users">
                                <td class="email-cell">
                                    <i class="fa-solid fa-user me-2 text-muted"></i>
                                    {{ user.email }}
                                </td>
                                <td>
                                    <span class="role-badge" [class]="user.role">
                                        <i class="fa-solid" 
                                           [ngClass]="{
                                               'fa-eye': user.role === 'visitor',
                                               'fa-pen': user.role === 'editor',
                                               'fa-crown': user.role === 'admin'
                                           }"></i>
                                        {{ user.role }}
                                    </span>
                                </td>
                                <td>
                                    <select [(ngModel)]="user.selectedRole" class="form-select form-select-sm w-auto">
                                        <option value="editor">📝 Éditeur</option>
                                        <option value="admin">👑 Administrateur</option>
                                    </select>
                                </td>
                                <td>
                                    <button 
                                        (click)="updateRole(user)" 
                                        [disabled]="user.updating || user.selectedRole === user.role"
                                        class="btn btn-sm"
                                        [ngClass]="user.selectedRole === user.role ? 'btn-secondary' : 'btn-primary'">
                                        <i class="fa-solid" 
                                           [ngClass]="user.updating ? 'fa-spinner fa-spin' : 'fa-save'"></i>
                                        {{ user.updating ? 'Attribution...' : 'Attribuer' }}
                                    </button>
                                </td>
                            </tr>
                            <tr *ngIf="users.length === 0">
                                <td colspan="4" class="text-center text-muted py-5">
                                    <i class="fa-solid fa-users-slash fa-2x mb-2 d-block"></i>
                                    Aucun utilisateur trouvé
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Info box -->
            <div class="card mt-4 bg-light border-0">
                <div class="card-body">
                    <h6 class="card-title mb-3">
                        <i class="fa-solid fa-circle-info me-2 text-primary"></i>
                        Informations sur les rôles
                    </h6>
                    <div class="row g-3">
                        <div class="col-md-4">
                            <div class="d-flex align-items-center gap-2">
                                <i class="fa-solid fa-eye fa-lg text-muted"></i>
                                <div>
                                    <strong>Visiteur</strong>
                                    <small class="d-block text-muted">Non connecté, lecture seule</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="d-flex align-items-center gap-2">
                                <i class="fa-solid fa-pen fa-lg text-info"></i>
                                <div>
                                    <strong>Éditeur</strong>
                                    <small class="d-block text-muted">Peut créer/modifier des données</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="d-flex align-items-center gap-2">
                                <i class="fa-solid fa-crown fa-lg text-warning"></i>
                                <div>
                                    <strong>Administrateur</strong>
                                    <small class="d-block text-muted">Accès total à toutes les données</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="alert alert-info mt-3 mb-0 py-2">
                        <i class="fa-solid fa-info-circle me-2"></i>
                        <small>Après attribution d'un rôle, l'utilisateur doit se déconnecter/reconnecter pour que le changement soit effectif.</small>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .users-roles-container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .email-cell {
            font-family: monospace;
            font-size: 0.9rem;
        }
        .role-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }
        .role-badge.visitor {
            background: #e9ecef;
            color: #495057;
        }
        .role-badge.editor {
            background: #d1ecf1;
            color: #0c5460;
        }
        .role-badge.admin {
            background: #cce5ff;
            color: #004085;
        }
        .theme-dark .role-badge.visitor {
            background: #2d3748;
            color: #a0aec0;
        }
        .theme-dark .role-badge.editor {
            background: #1a365d;
            color: #90cdf4;
        }
        .theme-dark .role-badge.admin {
            background: #2d3748;
            color: #fbbf24;
        }
        .theme-dark .bg-light {
            background: #1a202c !important;
        }
        .form-select-sm {
            font-size: 0.875rem;
            padding: 0.25rem 2rem 0.25rem 0.75rem;
        }
    `]
})
export class UsersRolesComponent implements OnInit {
    users: any[] = [];
    loading = false;
    errorMessage = '';

    constructor(
        private roleService: RoleService,
        private authService: AuthService
    ) { }

    async ngOnInit() {
        await this.loadUsers();
    }

    async loadUsers() {
        this.loading = true;
        this.errorMessage = '';
        try {
            this.users = await this.roleService.getAllUsersWithRoles();
            this.users.forEach(user => {
                user.selectedRole = user.role === 'admin' ? 'admin' : 'editor';
                user.updating = false;
            });
        } catch (error: any) {
            this.errorMessage = error.message || 'Erreur lors du chargement des utilisateurs';
            console.error('Erreur:', error);
        } finally {
            this.loading = false;
        }
    }

    async updateRole(user: any) {
        if (user.selectedRole === user.role) return;

        user.updating = true;
        const result = await this.roleService.assignRole(user.email, user.selectedRole);

        if (result.success) {
            user.role = user.selectedRole;
            // Notification légère (peut être remplacée par un toast)
            const notification = document.createElement('div');
            notification.className = 'alert alert-success position-fixed bottom-0 end-0 m-3';
            notification.style.zIndex = '1050';
            notification.innerHTML = `<i class="fa-solid fa-check-circle me-2"></i>${result.message}`;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);

            // Si c'est l'utilisateur courant, forcer la reconnexion
            const currentUser = this.authService.getCurrentUser();
            if (currentUser?.email === user.email) {
                setTimeout(() => {
                    alert('Votre rôle a été modifié. Veuillez vous reconnecter pour appliquer les changements.');
                }, 500);
            }
        } else {
            alert('Erreur: ' + result.message);
        }
        user.updating = false;
    }
}