import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';
import { PortalShellComponent } from './layout/portal-shell.component';
import { AdminPageComponent } from './pages/admin-page/admin-page.component';
import { ArchitecturePageComponent } from './pages/architecture-page/architecture-page.component';
import { AuthPageComponent } from './pages/auth-page/auth-page.component';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { KafkaPageComponent } from './pages/kafka-page/kafka-page.component';
import { ProfilePageComponent } from './pages/profile-page/profile-page.component';
import { ReportsPageComponent } from './pages/reports-page/reports-page.component';
import { WorkflowPageComponent } from './pages/workflow-page/workflow-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth' },
  { path: 'auth', component: AuthPageComponent },
  {
    path: 'auth/google/callback',
    loadComponent: () =>
      import('./pages/auth-page/google-callback.component')
        .then(m => m.GoogleCallbackComponent)
  },
  {
    path: 'portal',
    component: PortalShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardPageComponent },
      { path: 'profile', component: ProfilePageComponent },
      { path: 'workflow', component: WorkflowPageComponent },
      { path: 'reports', component: ReportsPageComponent },
      { path: 'architecture', component: ArchitecturePageComponent },
      { path: 'admin', component: AdminPageComponent },
      { path: 'kafka', component: KafkaPageComponent }
    ]
  },
  { path: '**', redirectTo: 'auth' }
];
