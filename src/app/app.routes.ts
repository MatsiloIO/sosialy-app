import { Routes } from '@angular/router';
import { MembersListComponent } from './components/members/members-list.component';
import { CashierDashboardComponent } from './components/cashier/cashier-dashboard.component';
import { MonthlyContributionsComponent } from './components/contributions/monthly-contributions.component';
import { PublicContributionsComponent } from './components/public/public-contributions.component';
import { SettingsComponent } from './components/settings/settings.component';
import { LoginComponent } from './components/auth/login/login.component';
import { LogoutComponent } from './components/auth/logout/logout.component';
import { UnauthorizedComponent } from './components/auth/unauthorized/unauthorized.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { PublicGuard } from './guards/public.guard';
import { ProfileComponent } from './components/profile/profile.component';
import { CreateUserComponent } from './components/admin/create-user.component';
import { TokenDashboardComponent } from './components/tokens/token-dashboard.component';
import { MemberTokensComponent } from './components/tokens/member-tokens.component';
import { TokenAssignComponent } from './components/tokens/token-assign.component';

export const routes: Routes = [
    { path: '', redirectTo: '/members', pathMatch: 'full' },
    { path: 'login', component: LoginComponent, canActivate: [PublicGuard] },
    { path: 'logout', component: LogoutComponent },
    { path: 'unauthorized', component: UnauthorizedComponent },

    // Routes publiques (accessibles aux visiteurs non authentifiés)
    {
        path: 'public/cotisations',
        component: PublicContributionsComponent,
    },

    // Routes protégées (authentification requise)
    {
        path: 'members',
        component: MembersListComponent,
        canActivate: [AuthGuard]
        // editor et admin peuvent voir/modifier (défini dans les politiques RLS)
    },
    {
        path: 'tokens',
        component: TokenDashboardComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { requiredRole: 'editor' }
    },
    {
        path: 'tokens/member/:id',
        component: MemberTokensComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { requiredRole: 'editor' }
    },
    {
        path: 'tokens/assign',
        component: TokenAssignComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { requiredRole: 'editor' }
    },
    {
        path: 'cashier',
        component: CashierDashboardComponent,
        canActivate: [AuthGuard]
        // editor et admin peuvent voir/modifier
    },
    {
        path: 'contributions',
        component: MonthlyContributionsComponent,
        canActivate: [AuthGuard]
        // editor et admin peuvent voir/modifier
    },

    // Routes admin seulement
    {
        path: 'settings',
        component: SettingsComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { requiredRole: 'admin' }
        // Seul l'admin peut modifier les paramètres
    },

    // Route admin pour gérer les utilisateurs et leurs rôles
    {
        path: 'admin/users',
        loadComponent: () => import('./components/admin/users-roles.component').then(m => m.UsersRolesComponent),
        canActivate: [AuthGuard, RoleGuard],
        data: { requiredRole: 'admin' }
    },
    {
        path: 'admin/logs',
        loadComponent: () => import('./components/admin/audit-logs.component').then(m => m.AuditLogsComponent),
        canActivate: [AuthGuard, RoleGuard],
        data: { requiredRole: 'admin' }
    },
    {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'admin/users/create',
        component: CreateUserComponent,
        canActivate: [AuthGuard, RoleGuard],
        data: { requiredRole: 'admin' }
    }
];