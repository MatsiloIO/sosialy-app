import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, AppSettings } from '../../services/settings.service';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
    settings: AppSettings = { montantA: 5000, montantB: 3000 };
    successMessage = '';

    constructor(private settingsService: SettingsService) { }

    async ngOnInit() {
        await this.settingsService.initSettings();
        this.settings = this.settingsService.getSettings();
    }

    async saveSettings() {
        await this.settingsService.updateSettings(this.settings);
        this.successMessage = 'Paramètres enregistrés.';
        setTimeout(() => this.successMessage = '', 3000);
    }

    async resetDefaults() {
        this.settings = { montantA: 5000, montantB: 3000 };
        await this.saveSettings();
    }
}
