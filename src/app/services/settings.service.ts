
import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface AppSettings {
    montantA: number;
    montantB: number;
}

@Injectable({
    providedIn: 'root'
})
export class SettingsService {
    private readonly STORAGE_KEY = 'gestion-sociale-settings';
    private settings: AppSettings = {
        montantA: 5000,
        montantB: 3000
    };

    constructor(private supabaseService: SupabaseService) {
        this.loadLocal();
    }

    private loadLocal() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as AppSettings;
                if (parsed && typeof parsed.montantA === 'number' && typeof parsed.montantB === 'number') {
                    this.settings = parsed;
                }
            }
        } catch {
            // ignore malformed settings and keep defaults
        }
    }

    private saveLocal() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    }

    async initSettings(): Promise<void> {
        this.loadLocal();
        try {
            const dbSettings = await this.supabaseService.getAppSettings();
            if (dbSettings) {
                // dbSettings is a Record<string, any> (key/value). Coerce known values.
                const newSettings = { ...this.settings };
                if (dbSettings.hasOwnProperty('montantA')) {
                    const v = dbSettings['montantA'];
                    newSettings.montantA = typeof v === 'number' ? v : Number(v);
                }
                if (dbSettings.hasOwnProperty('montantB')) {
                    const v = dbSettings['montantB'];
                    newSettings.montantB = typeof v === 'number' ? v : Number(v);
                }
                this.settings = newSettings;
                this.saveLocal();
            }
        } catch (error) {
            console.warn('Impossible de charger les paramètres depuis la base de données, utilisation du localStorage.', error);
        }
    }

    getSettings(): AppSettings {
        return { ...this.settings };
    }

    getMontantCotisation(categorie: string): number {
        return categorie === 'A' ? this.settings.montantA : this.settings.montantB;
    }

    async updateSettings(settings: AppSettings): Promise<void> {
        this.settings = { ...settings };
        this.saveLocal();
        try {
            // Persist as key/value pairs (values can be any JSON-serializable type)
            await this.supabaseService.upsertAppSettings({
                montantA: this.settings.montantA,
                montantB: this.settings.montantB
            });
        } catch (error) {
            console.warn("Impossible d'enregistrer les paramètres dans la base de données, sauvegarde locale uniquement.", error);
        }
    }

    getSavedPageSize(storageKey: string, defaultPageSize: number): number {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw !== null) {
                const value = Number(raw);
                if (Number.isFinite(value) && value > 0) {
                    return Math.round(value);
                }
            }
        } catch {
            // ignore invalid values
        }
        return defaultPageSize;
    }

    savePageSize(storageKey: string, pageSize: number): void {
        try {
            localStorage.setItem(storageKey, String(pageSize));
        } catch {
            // ignore storage errors
        }
    }
}
