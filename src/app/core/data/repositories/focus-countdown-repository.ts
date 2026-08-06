import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database.service';
import { FocusCountdown } from '../../models/focus.model';

@Service()
export class FocusCountdownRepository {
  private readonly databaseService = inject(DatabaseService);
  private get table() {
    return this.databaseService.db.focusCountdowns;
  }

  getAll(): Promise<FocusCountdown[]> {
    return this.table.toArray();
  }

  async create(countdown: Omit<FocusCountdown, 'id' | 'createdAt' | 'updatedAt'>): Promise<FocusCountdown> {
    const now = new Date().toISOString();
    const toSave = { ...countdown, createdAt: now, updatedAt: now };
    const id = await this.table.add(toSave);
    return { ...toSave, id };
  }

  async delete(id: number): Promise<void> {
    await this.table.delete(id);
  }
}
