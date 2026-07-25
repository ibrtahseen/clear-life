import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database.service';
import { PrayerHistoryEntry, PrayerName } from '../../models/prayer.model';
import { IsoDate } from '../../models/common.model';

@Service()
export class PrayerHistoryRepository {
  private readonly databaseService = inject(DatabaseService);
  private get table() {
    return this.databaseService.db.prayerHistory;
  }

  getAll(): Promise<PrayerHistoryEntry[]> {
    return this.table.toArray();
  }

  getForDate(date: IsoDate): Promise<PrayerHistoryEntry[]> {
    return this.table.where('date').equals(date).toArray();
  }

  getForRange(start: IsoDate, end: IsoDate): Promise<PrayerHistoryEntry[]> {
    return this.table.where('date').between(start, end, true, true).toArray();
  }

  async getEntry(date: IsoDate, prayerName: PrayerName): Promise<PrayerHistoryEntry | undefined> {
    return this.table.where('[date+prayerName]').equals([date, prayerName]).first();
  }

  async setCompletion(
    date: IsoDate,
    prayerName: PrayerName,
    completed: boolean,
    scheduledTime: string | null,
  ): Promise<PrayerHistoryEntry> {
    const existing = await this.getEntry(date, prayerName);
    const entry: PrayerHistoryEntry = {
      id: existing?.id,
      date,
      prayerName,
      completed,
      scheduledTime: scheduledTime ?? existing?.scheduledTime ?? null,
      completedAt: completed ? new Date().toISOString() : null,
    };
    const id = await this.table.put(entry);
    return { ...entry, id };
  }

  async bulkPut(entries: PrayerHistoryEntry[]): Promise<void> {
    await this.table.bulkPut(entries);
  }

  async clear(): Promise<void> {
    await this.table.clear();
  }
}
