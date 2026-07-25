import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database.service';
import { QuranProgressState, QuranReadingLogEntry } from '../../models/quran.model';

const SINGLETON_ID = 1;

@Service()
export class QuranRepository {
  private readonly databaseService = inject(DatabaseService);
  private get progressTable() {
    return this.databaseService.db.quranProgress;
  }
  private get logTable() {
    return this.databaseService.db.quranReadingLog;
  }

  async getProgress(): Promise<QuranProgressState> {
    const existing = await this.progressTable.get(SINGLETON_ID);
    return (
      existing ?? {
        id: SINGLETON_ID,
        currentPage: 1,
        completions: 0,
        updatedAt: new Date().toISOString(),
      }
    );
  }

  async saveProgress(state: QuranProgressState): Promise<void> {
    await this.progressTable.put({ ...state, id: SINGLETON_ID, updatedAt: new Date().toISOString() });
  }

  getLog(): Promise<QuranReadingLogEntry[]> {
    return this.logTable.toArray();
  }

  async addLogEntry(entry: Omit<QuranReadingLogEntry, 'id' | 'createdAt'>): Promise<QuranReadingLogEntry> {
    const toSave = { ...entry, createdAt: new Date().toISOString() } as QuranReadingLogEntry;
    const id = await this.logTable.add(toSave);
    return { ...toSave, id };
  }

  async bulkPutLog(entries: QuranReadingLogEntry[]): Promise<void> {
    await this.logTable.bulkPut(entries);
  }

  async deleteLogEntry(id: number): Promise<void> {
    await this.logTable.delete(id);
  }

  async clear(): Promise<void> {
    await this.progressTable.clear();
    await this.logTable.clear();
  }
}
