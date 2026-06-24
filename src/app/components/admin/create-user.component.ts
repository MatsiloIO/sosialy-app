// src/app/components/admin/create-user.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-create-user',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
        <div class="create-user-container">
            <div class="card">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h3 class="mb-0">
                                <i class="fa-solid fa-user-plus me-2"></i>
                                Créer un nouvel utilisateur
                            </h3>
                            <p class="text-muted mb-0 mt-1">
                                L'administrateur choisit le mot de passe et le communique à l'utilisateur
                            </p>
                        </div>
                        <a routerLink="/admin/users" class="btn btn-outline-secondary btn-sm">
                            <i class="fa-solid fa-arrow-left me-1"></i>
                            Retour
                        </a>
                    </div>
                </div>
                <div class="card-body">
                    <form (ngSubmit)="onSubmit()">
                        <!-- Informations personnelles -->
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">Nom complet *</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="fa-solid fa-user"></i></span>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        [(ngModel)]="fullName" 
                                        name="fullName"
                                        required 
                                        placeholder="Jean Dupont"
                                    >
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Email *</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="fa-solid fa-envelope"></i></span>
                                    <input 
                                        type="email" 
                                        class="form-control" 
                                        [(ngModel)]="email" 
                                        name="email"
                                        required 
                                        placeholder="jean@exemple.com"
                                    >
                                </div>
                            </div>
                        </div>

                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">Téléphone</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="fa-solid fa-phone"></i></span>
                                    <input 
                                        type="tel" 
                                        class="form-control" 
                                        [(ngModel)]="phone" 
                                        name="phone"
                                        placeholder="+261 XX XXX XXXX"
                                    >
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Rôle *</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="fa-solid fa-tag"></i></span>
                                    <select class="form-select" [(ngModel)]="role" name="role">
                                        <option value="editor">📝 Éditeur</option>
                                        <option value="admin">👑 Administrateur</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Mot de passe -->
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">Mot de passe *</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="fa-solid fa-lock"></i></span>
                                    <input 
                                        [type]="showPassword ? 'text' : 'password'" 
                                        class="form-control" 
                                        [(ngModel)]="password" 
                                        name="password"
                                        required 
                                        placeholder="Choisir un mot de passe"
                                    >
                                    <button 
                                        type="button" 
                                        class="btn btn-outline-secondary" 
                                        (click)="showPassword = !showPassword">
                                        <i class="fa-solid" [ngClass]="showPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
                                    </button>
                                </div>
                                <small class="text-muted">Minimum 6 caractères - À communiquer à l'utilisateur</small>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">&nbsp;</label>
                                <button 
                                    type="button" 
                                    class="btn btn-outline-secondary w-100"
                                    (click)="generateRandomPassword()">
                                    <i class="fa-solid fa-dice me-1"></i>
                                    Générer un mot de passe aléatoire
                                </button>
                            </div>
                        </div>

                        <!-- Option première connexion -->
                        <div class="mb-3">
                            <div class="form-check">
                                <input 
                                    class="form-check-input" 
                                    type="checkbox" 
                                    [(ngModel)]="requirePasswordChange" 
                                    name="requirePasswordChange"
                                    id="requirePasswordChange"
                                    checked>
                                <label class="form-check-label" for="requirePasswordChange">
                                    <i class="fa-solid fa-key me-1"></i>
                                    L'utilisateur devra changer son mot de passe à la première connexion
                                </label>
                            </div>
                        </div>

                        <div class="alert alert-warning">
                            <i class="fa-solid fa-exclamation-triangle me-2"></i>
                            <strong>Attention :</strong> Aucun email ne sera envoyé. L'administrateur doit communiquer 
                            le mot de passe à l'utilisateur.
                        </div>

                        <!-- Boutons action -->
                        <div class="d-flex gap-2">
                            <button 
                                type="submit" 
                                class="btn btn-primary" 
                                [disabled]="loading">
                                <ng-container *ngIf="loading; else notLoading">
                                    <i class="fa-solid fa-spinner fa-spin"></i>
                                    Création en cours...
                                </ng-container>
                                <ng-template #notLoading>
                                    <i class="fa-solid fa-save"></i>
                                    Créer l'utilisateur
                                </ng-template>
                            </button>
                            <button 
                                type="button" 
                                class="btn btn-outline-secondary" 
                                routerLink="/admin/users">
                                Annuler
                            </button>
                        </div>

                        <!-- Messages -->
                        <div *ngIf="successMessage" class="alert alert-success mt-3">
                            <i class="fa-solid fa-check-circle me-2"></i>
                            {{ successMessage }}
                        </div>
                        <div *ngIf="errorMessage" class="alert alert-danger mt-3">
                            <i class="fa-solid fa-circle-exclamation me-2"></i>
                            {{ errorMessage }}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .create-user-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .card {
            border-radius: 1rem;
            border: none;
            box-shadow: var(--card-shadow);
        }
        .card-header {
            background: transparent;
            border-bottom: 1px solid var(--border-color);
            padding: 1.25rem 1.5rem;
        }
        .input-group-text {
            min-width: 40px;
            justify-content: center;
        }
        @media (max-width: 768px) {
            .create-user-container {
                padding: 16px;
            }
        }
    `]
})
export class CreateUserComponent {
    fullName = '';
    email = '';
    phone = '';
    role: 'editor' | 'admin' = 'editor';
    password = '';
    requirePasswordChange = true;

    showPassword = false;
    loading = false;
    successMessage = '';
    errorMessage = '';

    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    generateRandomPassword(): void {
        const length = 10;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        this.password = password;
    }

    async onSubmit() {
        this.errorMessage = '';
        this.successMessage = '';

        if (!this.fullName.trim()) {
            this.errorMessage = 'Veuillez entrer le nom complet';
            return;
        }
        if (!this.email.trim()) {
            this.errorMessage = 'Veuillez entrer l\'email';
            return;
        }
        if (!this.email.includes('@')) {
            this.errorMessage = 'Email invalide';
            return;
        }
        if (!this.password || this.password.length < 6) {
            this.errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
            return;
        }

        this.loading = true;

        try {
            const result = await this.authService.createUser({
                email: this.email,
                password: this.password,
                fullName: this.fullName,
                phone: this.phone,
                role: this.role,
                requirePasswordChange: this.requirePasswordChange
            });

            if (result.success) {
                this.successMessage = `✅ Utilisateur "${this.fullName}" créé avec succès ! 
                    Mot de passe à communiquer : ${this.password}`;

                this.fullName = '';
                this.email = '';
                this.phone = '';
                this.password = '';

                setTimeout(() => {
                    this.router.navigate(['/admin/users']);
                }, 3000);
            } else {
                this.errorMessage = result.error?.message || 'Erreur lors de la création';
            }
        } catch (error: any) {
            this.errorMessage = error.message || 'Une erreur est survenue';
        } finally {
            this.loading = false;
        }
    }
}