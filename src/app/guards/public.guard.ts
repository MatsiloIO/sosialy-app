// src/app/guards/public.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, map, take, filter } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class PublicGuard implements CanActivate {
    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return this.authService.loading$.pipe(
            filter(loading => !loading),
            take(1),
            map(() => {
                if (this.authService.isAuthenticated()) {
                    console.log('🔐 PublicGuard: déjà connecté, redirection');
                    return this.router.createUrlTree(['/members']);
                }
                return true;
            })
        );
    }
}