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
  private authSubscription: Subscription | null = null;

  constructor(private authService: AuthService, private router: Router) { }

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
    this.authService.currentUser$.subscribe(user => {
      const wasAuthenticated = this.isAuthenticated;
      this.isAuthenticated = user !== null;
      this.userName = this.authService.getUserName() || '';
      // ✅ Si déconnecté, rediriger immédiatement vers login
      if (!user && wasAuthenticated) {
        this.router.navigate(['/login']);
      }
      console.log('🔍 isAuthenticated:', this.isAuthenticated);
    });

    // Abonnement au rôle
    this.authService.currentRole$.subscribe(role => {
      this.userRole = role;
    });
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