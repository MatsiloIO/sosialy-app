// src/app/components/profile/profile.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SupabaseService } from '../../services/supabase.service';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
        <div class="profile-container">
            <div class="card">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h3 class="mb-0">
                                <i class="fa-solid fa-user-circle me-2"></i>
                                Mon profil
                            </h3>
                            <p class="text-muted mb-0 mt-1">
                                Gérez vos informations personnelles
                            </p>
                        </div>
                        <a routerLink="/members" class="btn btn-outline-secondary btn-sm">
                            <i class="fa-solid fa-arrow-left me-1"></i>
                            Retour
                        </a>
                    </div>
                </div>
                <div class="card-body">
                    <!-- Informations personnelles -->
                    <form (ngSubmit)="onUpdateProfile()">
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">Nom complet</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="fa-solid fa-user"></i></span>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        [(ngModel)]="fullName" 
                                        name="fullName"
                                        placeholder="Votre nom complet"
                                    >
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Email</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="fa-solid fa-envelope"></i></span>
                                    <input 
                                        type="email" 
                                        class="form-control" 
                                        [value]="email" 
                                        disabled
                                    >
                                </div>
                                <small class="text-muted">L'email ne peut pas être modifié</small>
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
                                        placeholder="Votre numéro de téléphone"
                                    >
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Rôle</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="fa-solid fa-tag"></i></span>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        [value]="roleDisplay" 
                                        disabled
                                    >
                                </div>
                            </div>
                        </div>

                        <div class="mb-3">
                            <button type="submit" class="btn btn-primary" [disabled]="updatingProfile">
                                <i class="fa-solid" [ngClass]="updatingProfile ? 'fa-spinner fa-spin' : 'fa-save'"></i>
                                {{ updatingProfile ? 'Enregistrement...' : 'Mettre à jour le profil' }}
                            </button>
                        </div>

                        <div *ngIf="profileSuccess" class="alert alert-success">
                            <i class="fa-solid fa-check-circle me-2"></i>
                            {{ profileSuccess }}
                        </div>
                        <div *ngIf="profileError" class="alert alert-danger">
                            <i class="fa-solid fa-circle-exclamation me-2"></i>
                            {{ profileError }}
                        </div>
                    </form>

                    <hr class="my-4">

                    <!-- Changement de mot de passe -->
                    <h5 class="mb-3">
                        <i class="fa-solid fa-key me-2"></i>
                        Changer mon mot de passe
                    </h5>
                    
                    <form (ngSubmit)="onChangePassword()">
                        <!-- Mot de passe actuel -->
                        <div class="mb-3">
                            <label class="form-label">Mot de passe actuel</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="fa-solid fa-lock"></i></span>
                                <input 
                                    [type]="showCurrentPassword ? 'text' : 'password'" 
                                    class="form-control" 
                                    [(ngModel)]="currentPassword" 
                                    name="currentPassword"
                                    required 
                                    placeholder="Entrez votre mot de passe actuel"
                                >
                                <button 
                                    type="button" 
                                    class="btn btn-outline-secondary" 
                                    (click)="toggleCurrentPassword($event)">
                                    <i class="fa-solid" [ngClass]="showCurrentPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Nouveau mot de passe -->
                        <div class="mb-3">
                            <label class="form-label">Nouveau mot de passe</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="fa-solid fa-lock"></i></span>
                                <input 
                                    [type]="showNewPassword ? 'text' : 'password'" 
                                    class="form-control" 
                                    [(ngModel)]="newPassword" 
                                    name="newPassword"
                                    required 
                                    placeholder="Nouveau mot de passe (min. 6 caractères)"
                                >
                                <button 
                                    type="button" 
                                    class="btn btn-outline-secondary" 
                                    (click)="toggleNewPassword($event)">
                                    <i class="fa-solid" [ngClass]="showNewPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Confirmation -->
                        <div class="mb-3">
                            <label class="form-label">Confirmer le mot de passe</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="fa-solid fa-lock"></i></span>
                                <input 
                                    [type]="showConfirmPassword ? 'text' : 'password'" 
                                    class="form-control" 
                                    [(ngModel)]="confirmPassword" 
                                    name="confirmPassword"
                                    required 
                                    placeholder="Confirmez le nouveau mot de passe"
                                >
                                <button 
                                    type="button" 
                                    class="btn btn-outline-secondary" 
                                    (click)="toggleConfirmPassword($event)">
                                    <i class="fa-solid" [ngClass]="showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
                                </button>
                            </div>
                        </div>

                        <div class="mb-3">
                            <button type="submit" class="btn btn-warning" [disabled]="updatingPassword">
                                <i class="fa-solid" [ngClass]="updatingPassword ? 'fa-spinner fa-spin' : 'fa-key'"></i>
                                {{ updatingPassword ? 'Changement en cours...' : 'Changer le mot de passe' }}
                            </button>
                        </div>

                        <div *ngIf="passwordSuccess" class="alert alert-success">
                            <i class="fa-solid fa-check-circle me-2"></i>
                            {{ passwordSuccess }}
                        </div>
                        <div *ngIf="passwordError" class="alert alert-danger">
                            <i class="fa-solid fa-circle-exclamation me-2"></i>
                            {{ passwordError }}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .profile-container {
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
        .btn-outline-secondary {
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
        }
        @media (max-width: 768px) {
            .profile-container {
                padding: 16px;
            }
        }
    `]
})
export class ProfileComponent implements OnInit {
    fullName = '';
    email = '';
    phone = '';
    roleDisplay = '';

    currentPassword = '';
    newPassword = '';
    confirmPassword = '';

    updatingProfile = false;
    updatingPassword = false;
    profileSuccess = '';
    profileError = '';
    passwordSuccess = '';
    passwordError = '';

    showCurrentPassword = false;
    showNewPassword = false;
    showConfirmPassword = false;

    constructor(
        private authService: AuthService,
        private supabaseService: SupabaseService
    ) { }

    async ngOnInit() {
        await this.loadUserProfile();
    }

    async loadUserProfile() {
        const user = this.authService.getCurrentUser();
        if (user) {
            this.email = user.email || '';
            this.fullName = user.user_metadata?.['full_name'] || user.user_metadata?.['name'] || '';
            this.phone = user.user_metadata?.['phone'] || '';
            const role = this.authService.getCurrentRole();
            this.roleDisplay = role === 'admin' ? 'Administrateur' : 'Éditeur';
        }
    }

    // ✅ Empêcher la propagation de l'événement pour éviter le gel
    toggleCurrentPassword(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        this.showCurrentPassword = !this.showCurrentPassword;
        // Forcer la détection de changement si nécessaire
        setTimeout(() => { }, 0);
    }

    toggleNewPassword(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        this.showNewPassword = !this.showNewPassword;
        setTimeout(() => { }, 0);
    }

    toggleConfirmPassword(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        this.showConfirmPassword = !this.showConfirmPassword;
        setTimeout(() => { }, 0);
    }

    async onUpdateProfile() {
        this.profileError = '';
        this.profileSuccess = '';
        this.updatingProfile = true;

        try {
            const { error } = await this.supabaseService.supabase.auth.updateUser({
                data: {
                    full_name: this.fullName,
                    name: this.fullName,
                    phone: this.phone
                }
            });
            if (error) throw error;
            this.profileSuccess = 'Profil mis à jour avec succès !';
            await this.authService.refreshSession();
            await this.loadUserProfile();
            setTimeout(() => { this.profileSuccess = ''; }, 3000);
        } catch (error: any) {
            this.profileError = error.message || 'Erreur lors de la mise à jour';
        } finally {
            this.updatingProfile = false;
        }
    }

    async onChangePassword() {
        this.passwordError = '';
        this.passwordSuccess = '';

        if (!this.currentPassword) {
            this.passwordError = 'Veuillez entrer votre mot de passe actuel';
            return;
        }
        if (!this.newPassword || this.newPassword.length < 6) {
            this.passwordError = 'Le nouveau mot de passe doit contenir au moins 6 caractères';
            return;
        }
        if (this.newPassword !== this.confirmPassword) {
            this.passwordError = 'Les mots de passe ne correspondent pas';
            return;
        }

        this.updatingPassword = true;

        try {
            const { error } = await this.supabaseService.supabase.auth.updateUser({
                password: this.newPassword
            });
            if (error) throw error;
            this.passwordSuccess = 'Mot de passe changé avec succès ! Veuillez vous reconnecter.';
            this.currentPassword = '';
            this.newPassword = '';
            this.confirmPassword = '';
            setTimeout(() => { this.authService.signOut(); }, 2000);
        } catch (error: any) {
            this.passwordError = error.message || 'Erreur lors du changement';
        } finally {
            this.updatingPassword = false;
        }
    }
}