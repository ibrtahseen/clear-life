import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database.service';
import { AppState } from '../../models/notification.model';

const SINGLETON_ID = 1;
export const CURRENT_SCHEMA_VERSION = 1;

@Service()
export class AppStateRepository {
  private readonly databaseService = inject(DatabaseService);
  private get table() {
    return this.databaseService.db.appState;
  }

  async get(): Promise<AppState> {
    const existing = await this.table.get(SINGLETON_ID);
    return (
      existing ?? {
        id: SINGLETON_ID,
        onboardingCompleted: false,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        lastPrayerSyncDate: null,
        lastOpenedAt: new Date().toISOString(),
      }
    );
  }

  async save(state: AppState): Promise<void> {
    await this.table.put({ ...state, id: SINGLETON_ID });
  }

  async patch(partial: Partial<AppState>): Promise<AppState> {
    const current = await this.get();
    const updated = { ...current, ...partial };
    await this.save(updated);
    return updated;
  }

  async markOnboardingComplete(): Promise<void> {
    await this.patch({ onboardingCompleted: true });
  }

  async clear(): Promise<void> {
    await this.table.clear();
  }
}
