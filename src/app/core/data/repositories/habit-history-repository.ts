import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database.service';
import { HabitHistoryEntry } from '../../models/habit.model';
import { IsoDate } from '../../models/common.model';

@Service()
export class HabitHistoryRepository {
  private readonly databaseService = inject(DatabaseService);
  private get table() {
    return this.databaseService.db.habitHistory;
  }

  getAll(): Promise<HabitHistoryEntry[]> {
    return this.table.toArray();
  }

  getForHabit(habitId: number): Promise<HabitHistoryEntry[]> {
    return this.table.where('habitId').equals(habitId).toArray();
  }

  getForDate(date: IsoDate): Promise<HabitHistoryEntry[]> {
    return this.table.where('date').equals(date).toArray();
  }

  getForRange(start: IsoDate, end: IsoDate): Promise<HabitHistoryEntry[]> {
    return this.table.where('date').between(start, end, true, true).toArray();
  }

  async getEntry(habitId: number, date: IsoDate): Promise<HabitHistoryEntry | undefined> {
    return this.table.where('[habitId+date]').equals([habitId, date]).first();
  }

  async setCompletion(habitId: number, date: IsoDate, completed: boolean): Promise<HabitHistoryEntry> {
    const existing = await this.getEntry(habitId, date);
    const entry: HabitHistoryEntry = {
      id: existing?.id,
      habitId,
      date,
      completed,
      completedAt: completed ? new Date().toISOString() : null,
    };
    const id = await this.table.put(entry);
    return { ...entry, id };
  }

  async bulkPut(entries: HabitHistoryEntry[]): Promise<void> {
    await this.table.bulkPut(entries);
  }

  async clear(): Promise<void> {
    await this.table.clear();
  }
}
