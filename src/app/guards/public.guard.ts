// src/app/guards/public.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, map, take } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class PublicGuard implements CanActivate {
    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return this.authService.currentUser$.pipe(
            take(1),
            map(user => {
                if (user) {
                    console.log('🔐 PublicGuard: Utilisateur déjà connecté, redirection vers /members');
                    return this.router.parseUrl('/members');
                }
                return true;
            })
        );
    }
}