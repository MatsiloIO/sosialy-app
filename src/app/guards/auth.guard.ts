/*src/app/guards/auth.guard.ts*/
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, map, take, filter } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        // ✅ Attendre que le chargement soit terminé avant de vérifier l'auth
        return this.authService.loading$.pipe(
            filter(loading => !loading), // Attendre que loading soit false
            take(1),
            map(() => {
                if (this.authService.isAuthenticated()) {
                    return true;
                }
                console.log('🔒 AuthGuard: non authentifié, redirection vers login');
                return this.router.createUrlTree(['/login']);
            })
        );
    }
}