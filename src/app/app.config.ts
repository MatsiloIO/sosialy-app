/*src/app.config.ts*/
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { PublicGuard } from './guards/public.guard';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    // Les services avec providedIn: 'root' n'ont PAS besoin d'être dans providers
    // AuthService, AuthGuard, RoleGuard sont déjà fournis via providedIn: 'root'
    RoleGuard,
    AuthGuard,
    PublicGuard
  ]
};
