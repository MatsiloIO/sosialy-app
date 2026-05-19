import { Routes } from '@angular/router';
import { MembersListComponent } from './components/members/members-list.component';
import { CashierDashboardComponent } from './components/cashier/cashier-dashboard.component';
import { MonthlyContributionsComponent } from './components/contributions/monthly-contributions.component';
import { PublicContributionsComponent } from './components/public/public-contributions.component';
import { SettingsComponent } from './components/settings/settings.component';
export const routes: Routes = [
    { path: '', redirectTo: '/members', pathMatch: 'full' },
    { path: 'members', component: MembersListComponent },
    { path: 'cashier', component: CashierDashboardComponent },
    { path: 'contributions', component: MonthlyContributionsComponent },
    { path: 'public/cotisations', component: PublicContributionsComponent },
    { path: 'settings', component: SettingsComponent }
];