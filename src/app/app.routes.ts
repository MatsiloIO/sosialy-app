import { Routes } from '@angular/router';
import { MembersListComponent } from './components/members/members-list.component';
import { CashierDashboardComponent } from './components/cashier/cashier-dashboard.component';
import { MonthlyContributionsComponent } from './components/contributions/monthly-contributions.component';
import { PublicContributionsComponent } from './components/public/public-contributions.component';
import { SettingsComponent } from './components/settings/settings.component';
import { LoginComponent } from './components/auth/login/login.component';
import { LogoutComponent } from './components/auth/logout/logout.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/members', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'logout', component: LogoutComponent },
    {
        path: 'members',
        component: MembersListComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'cashier',
        component: CashierDashboardComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'contributions',
        component: MonthlyContributionsComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'settings',
        component: SettingsComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'public/cotisations',
        component: PublicContributionsComponent
    }
];