import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database.service';
import { NotificationLogEntry } from '../../models/notification.model';

@Service()
export class NotificationRepository {
  private readonly databaseService = inject(DatabaseService);
  private get table() {
    return this.databaseService.db.notifications;
  }

  getAll(): Promise<NotificationLogEntry[]> {
    return this.table.orderBy('scheduledAt').toArray();
  }

  getUpcoming(fromIso: string): Promise<NotificationLogEntry[]> {
    return this.table
      .filter((n) => !n.sentAt && n.scheduledAt >= fromIso)
      .toArray();
  }

  async add(entry: Omit<NotificationLogEntry, 'id'>): Promise<NotificationLogEntry> {
    const id = await this.table.add(entry as NotificationLogEntry);
    return { ...entry, id };
  }

  async markSent(id: number): Promise<void> {
    await this.table.update(id, { sentAt: new Date().toISOString() });
  }

  async bulkPut(entries: NotificationLogEntry[]): Promise<void> {
    await this.table.bulkPut(entries);
  }

  async clear(): Promise<void> {
    await this.table.clear();
  }
}
