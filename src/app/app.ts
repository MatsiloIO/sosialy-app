import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';

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

  constructor(private authService: AuthService) { }

  ngOnInit() {
    this.initializeTheme();
    this.initializeAuth();
  }

  initializeTheme() {
    const storedTheme = localStorage.getItem(this.themeStorageKey);
    this.isDarkMode = storedTheme === 'dark';
    this.updateThemeClass();
  }

  initializeAuth() {
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = user !== null;
      this.userName = this.authService.getUserName() || '';
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
    this.authService.signOut().then(() => {
      window.location.reload();
    });
  }
}
