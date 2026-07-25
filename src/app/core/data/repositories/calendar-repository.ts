import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database.service';
import { CalendarNote } from '../../models/notification.model';

@Service()
export class CalendarRepository {
  private readonly databaseService = inject(DatabaseService);
  private get table() {
    return this.databaseService.db.calendarNotes;
  }

  getAll(): Promise<CalendarNote[]> {
    return this.table.toArray();
  }

  getForDate(date: string): Promise<CalendarNote | undefined> {
    return this.table.where('date').equals(date).first();
  }

  async setNote(date: string, note: string): Promise<CalendarNote> {
    const existing = await this.getForDate(date);
    const toSave: CalendarNote = {
      id: existing?.id,
      date,
      note,
      updatedAt: new Date().toISOString(),
    };
    const id = await this.table.put(toSave);
    return { ...toSave, id };
  }

  async bulkPut(notes: CalendarNote[]): Promise<void> {
    await this.table.bulkPut(notes);
  }

  async clear(): Promise<void> {
    await this.table.clear();
  }
}
