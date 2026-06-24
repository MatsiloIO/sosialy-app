/*src/app.ts*/
import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class App implements OnInit {
  showMobileSidebar = false;
  isDarkMode = false;
  private readonly themeStorageKey = 'gestion-sociale-theme';
  isAuthenticated = false;
  userName = '';
  userRole: string = 'visitor';
  canEdit: boolean = false;
  private authSubscription: Subscription | null = null;
  isLoading = true
  constructor(private authService: AuthService, private router: Router) {
    this.authService.loading$.subscribe(loading => {
      this.isLoading = loading;
    });
  }

  ngOnInit() {
    this.initializeTheme();
    this.initializeAuth();
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  initializeTheme() {
    const storedTheme = localStorage.getItem(this.themeStorageKey);
    this.isDarkMode = storedTheme === 'dark';
    this.updateThemeClass();
  }

  initializeAuth() {
    // ✅ Attendre la fin du chargement avant d'afficher l'interface
    this.authSubscription = this.authService.loading$.subscribe(loading => {
      this.isLoading = loading;

      // Une fois le chargement terminé, gérer les redirections
      if (!loading) {
        this.handleRedirectAfterLoad();
      }
    });
    this.authService.currentUser$.subscribe(user => {
      const wasAuthenticated = this.isAuthenticated;
      this.isAuthenticated = user !== null;
      this.userName = this.authService.getUserName() || '';

      // ✅ Si déconnecté, rediriger immédiatement vers login
      if (!user && wasAuthenticated) {
        this.router.navigate(['/login']);
      }
    });

    // Abonnement au rôle
    this.authService.currentRole$.subscribe(role => {
      this.userRole = role;
      this.canEdit = this.authService.canEdit();
    });
  }
  private handleRedirectAfterLoad() {
    const currentUrl = this.router.url;

    // Si connecté et sur login, rediriger vers members
    if (this.isAuthenticated && currentUrl === '/login') {
      this.router.navigate(['/members']);
    }
    // Si non connecté et pas sur login et pas sur public, rediriger vers login
    else if (!this.isAuthenticated && currentUrl !== '/login' && currentUrl !== '/public/cotisations') {
      this.router.navigate(['/login']);
    }
  }
  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem(this.themeStorageKey, this.isDarkMode ? 'dark' : 'light');
    this.updateThemeClass();
  }

  private updateThemeClass() {
    document.documentElement.classList.toggle('theme-dark', this.isDarkMode);
  }

  toggleMobileSidebar() {
    this.showMobileSidebar = !this.showMobileSidebar;
  }

  closeMobileSidebar() {
    this.showMobileSidebar = false;
  }

  logout() {
    this.authService.signOut();
  }
}