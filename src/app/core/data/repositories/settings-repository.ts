import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database.service';
import { AppSettings, DEFAULT_NOTIFICATION_SETTINGS } from '../../models/settings.model';

const SINGLETON_ID = 1;

export function buildDefaultSettings(): AppSettings {
  return {
    id: SINGLETON_ID,
    language: 'en',
    theme: 'system',
    firstDayOfWeek: 6,
    location: null,
    notifications: { ...DEFAULT_NOTIFICATION_SETTINGS },
    quranPagePerPry: 1,
    updatedAt: new Date().toISOString(),
  };
}

@Service()
export class SettingsRepository {
  private readonly databaseService = inject(DatabaseService);
  private get table() {
    return this.databaseService.db.settings;
  }

  async get(): Promise<AppSettings> {
    const existing = await this.table.get(SINGLETON_ID);
    return existing ?? buildDefaultSettings();
  }

  async save(settings: AppSettings): Promise<AppSettings> {
    const toSave: AppSettings = { ...settings, id: SINGLETON_ID, updatedAt: new Date().toISOString() };
    await this.table.put(toSave);
    return toSave;
  }

  async patch(partial: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get();
    return this.save({ ...current, ...partial });
  }

  async replace(settings: AppSettings): Promise<void> {
    await this.table.put({ ...settings, id: SINGLETON_ID });
  }

  async clear(): Promise<void> {
    await this.table.clear();
  }
}
