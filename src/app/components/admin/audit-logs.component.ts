import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditService } from '../../services/audit.service';

@Component({
    standalone: true,
    imports: [CommonModule],
    template: `
  <div class="card border-0 shadow-sm">
    <div class="card-header bg-white">
      <h5 class="mb-0">Journal d'activité</h5>
      <small class="text-muted">Actions effectuées par les utilisateurs (accessible uniquement aux admins)</small>
    </div>
    <div class="card-body p-0">
      <div class="table-responsive">
        <table class="table mb-0 align-middle">
          <thead class="table-light">
            <tr>
              <th>Date</th>
              <th>Utilisateur</th>
              <th>Action</th>
              <th>Détails</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let log of logs">
              <td>{{ log.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
              <td>{{ log.user_name || log.user_email || 'Anonyme' }}</td>
              <td><code>{{ log.action }}</code></td>
              <td><pre class="mb-0 small">{{ log.details }}</pre></td>
            </tr>
            <tr *ngIf="logs.length === 0">
              <td colspan="4" class="text-center py-4">Aucun log trouvé</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  `
})
export class AuditLogsComponent implements OnInit {
    logs: any[] = [];

    constructor(private audit: AuditService) { }

    async ngOnInit(): Promise<void> {
        try {
            this.logs = await this.audit.getLogs();
        } catch (e) {
            console.error('Erreur chargement logs:', e);
            this.logs = [];
        }
    }
}
