import { Component } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card">
            <div class="card-body text-center">
              <h3>Déconnexion</h3>
              <p>Vous êtes sur le point de vous déconnecter.</p>
              <button class="btn btn-primary" (click)="logout()">Se déconnecter</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LogoutComponent {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  logout(): void {
    this.authService.signOut().then(() => {
      this.router.navigate(['/login']);
    });
  }
}