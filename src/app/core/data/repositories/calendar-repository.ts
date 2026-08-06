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

  async bulkPut(notes: CalendarNote[]): Promise<void> {
    await this.table.bulkPut(notes);
  }

  async clear(): Promise<void> {
    await this.table.clear();
  }
}
