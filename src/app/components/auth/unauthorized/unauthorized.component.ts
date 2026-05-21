// src/app/components/auth/unauthorized/unauthorized.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-unauthorized',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
        <div class="unauthorized-container">
            <div class="card text-center p-5">
                <div class="unauthorized-icon mb-4">
                    <i class="fa-solid fa-lock fa-4x text-danger"></i>
                </div>
                <h1 class="h3 mb-3">Accès non autorisé</h1>
                <p class="text-muted mb-4">
                    Vous n'avez pas les permissions nécessaires pour accéder à cette page.
                </p>
                
                <div *ngIf="requiredRole || currentRole" class="alert alert-warning mb-4">
                    <div *ngIf="requiredRole">
                        <i class="fa-solid fa-key me-2"></i>
                        Rôle requis : <strong>{{ requiredRole }}</strong>
                    </div>
                    <div *ngIf="currentRole" class="mt-1">
                        <i class="fa-solid fa-user-tag me-2"></i>
                        Votre rôle : <strong>{{ currentRole }}</strong>
                    </div>
                </div>

                <div class="d-flex gap-3 justify-content-center">
                    <a routerLink="/members" class="btn btn-primary">
                        <i class="fa-solid fa-home me-2"></i>
                        Tableau de bord
                    </a>
                    <a routerLink="/login" class="btn btn-outline-secondary">
                        <i class="fa-solid fa-right-from-bracket me-2"></i>
                        Se reconnecter
                    </a>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .unauthorized-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: calc(100vh - 100px);
            padding: 20px;
        }
        .card {
            max-width: 500px;
            width: 100%;
            border-radius: 1rem !important;
        }
        .unauthorized-icon i {
            opacity: 0.7;
        }
        .alert {
            border-radius: 0.75rem;
        }
        @media (max-width: 768px) {
            .unauthorized-container {
                min-height: calc(100vh - 80px);
            }
            .card {
                margin: 16px;
            }
        }
    `]
})
export class UnauthorizedComponent {
    requiredRole: string | null = null;
    currentRole: string | null = null;

    constructor() {
        // Récupérer les paramètres de l'URL
        const urlParams = new URLSearchParams(window.location.search);
        this.requiredRole = urlParams.get('requiredRole');
        this.currentRole = urlParams.get('currentRole');
    }
}