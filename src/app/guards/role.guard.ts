/*src/app/guards/role.guard.ts*/
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, map, take, of } from 'rxjs';
import { AuthService, UserRole } from '../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class RoleGuard implements CanActivate {
    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        const requiredRole = route.data['requiredRole'] as UserRole;

        if (!requiredRole) return true;

        // Vérification synchrone rapide (optimisation)
        if (this.authService.isAuthenticated() && this.authService.hasRole(requiredRole)) {
            return true;
        }

        // Si non authentifié, rediriger vers login
        if (!this.authService.isAuthenticated()) {
            return this.router.createUrlTree(['/login'], {
                queryParams: { returnUrl: route.url.toString() }
            });
        }

        // Attendre le rôle pour vérification asynchrone
        return this.authService.currentRole$.pipe(
            take(1),
            map(role => {
                if (this.authService.hasRole(requiredRole)) {
                    return true;
                }

                return this.router.createUrlTree(['/unauthorized'], {
                    queryParams: {
                        requiredRole,
                        currentRole: role
                    }
                });
            })
        );
    }
}