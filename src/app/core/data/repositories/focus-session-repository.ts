import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database.service';
import { FocusSessionEntry } from '../../models/focus.model';
import { IsoDate } from '../../models/common.model';

@Service()
export class FocusSessionRepository {
  private readonly databaseService = inject(DatabaseService);
  private get table() {
    return this.databaseService.db.focusSessions;
  }

  getAll(): Promise<FocusSessionEntry[]> {
    return this.table.toArray();
  }

  getForDate(date: IsoDate): Promise<FocusSessionEntry[]> {
    return this.table.where('date').equals(date).toArray();
  }

  getForRange(start: IsoDate, end: IsoDate): Promise<FocusSessionEntry[]> {
    return this.table.where('date').between(start, end, true, true).toArray();
  }

  async create(entry: Omit<FocusSessionEntry, 'id'>): Promise<FocusSessionEntry> {
    const id = await this.table.add(entry );
    return { ...entry, id };
  }

  async bulkPut(entries: FocusSessionEntry[]): Promise<void> {
    await this.table.bulkPut(entries);
  }

  async clear(): Promise<void> {
    await this.table.clear();
  }
}
