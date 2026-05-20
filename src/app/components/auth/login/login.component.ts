import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class LoginComponent implements OnInit {
    loginForm: FormGroup;
    loading = false;
    error: string | null = null;
    showSignUp = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router
    ) {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            name: ['']
        });
    }

    ngOnInit(): void {
        // Si l'utilisateur est déjà connecté, rediriger vers la page d'accueil
        if (this.authService.isAuthenticated()) {
            this.router.navigate(['/members']);
        }
    }

    get f() {
        return this.loginForm.controls;
    }

    onSubmit(): void {
        if (this.loginForm.invalid) {
            return;
        }

        this.loading = true;
        this.error = null;

        if (this.showSignUp) {
            this.signUp();
        } else {
            this.signIn();
        }
    }

    private async signIn(): Promise<void> {
        try {
            const result = await this.authService.signIn(
                this.f['email'].value,
                this.f['password'].value
            );

            if (result.success) {
                this.router.navigate(['/members']);
            } else {
                this.error = result.error?.message || 'Erreur de connexion';
            }
        } catch (error) {
            this.error = 'Une erreur est survenue lors de la connexion';
        } finally {
            this.loading = false;
        }
    }

    private async signUp(): Promise<void> {
        try {
            const result = await this.authService.signUp(
                this.f['email'].value,
                this.f['password'].value,
                this.f['name'].value
            );

            if (result.success) {
                this.router.navigate(['/members']);
            } else {
                this.error = result.error?.message || 'Erreur d\'inscription';
            }
        } catch (error) {
            this.error = 'Une erreur est survenue lors de l\'inscription';
        } finally {
            this.loading = false;
        }
    }

    toggleMode(): void {
        this.showSignUp = !this.showSignUp;
        this.error = null;
        this.loginForm.reset();
    }
}