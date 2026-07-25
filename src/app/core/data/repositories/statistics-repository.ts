import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database.service';
import { WeeklyStatisticsSnapshot, MonthlyStatisticsSnapshot } from '../../models/statistics.model';

@Service()
export class StatisticsRepository {
  private readonly databaseService = inject(DatabaseService);

  getAllWeekly(): Promise<WeeklyStatisticsSnapshot[]> {
    return this.databaseService.db.weeklyStatistics.toArray();
  }

  getAllMonthly(): Promise<MonthlyStatisticsSnapshot[]> {
    return this.databaseService.db.monthlyStatistics.toArray();
  }

  async upsertWeekly(snapshot: WeeklyStatisticsSnapshot): Promise<void> {
    const existing = await this.databaseService.db.weeklyStatistics
      .where('weekStart')
      .equals(snapshot.weekStart)
      .first();
    await this.databaseService.db.weeklyStatistics.put({ ...snapshot, id: existing?.id });
  }

  async upsertMonthly(snapshot: MonthlyStatisticsSnapshot): Promise<void> {
    const existing = await this.databaseService.db.monthlyStatistics
      .where('[year+month]')
      .equals([snapshot.year, snapshot.month])
      .first();
    await this.databaseService.db.monthlyStatistics.put({ ...snapshot, id: existing?.id });
  }

  async bulkPutWeekly(snapshots: WeeklyStatisticsSnapshot[]): Promise<void> {
    await this.databaseService.db.weeklyStatistics.bulkPut(snapshots);
  }

  async bulkPutMonthly(snapshots: MonthlyStatisticsSnapshot[]): Promise<void> {
    await this.databaseService.db.monthlyStatistics.bulkPut(snapshots);
  }

  async clear(): Promise<void> {
    await this.databaseService.db.weeklyStatistics.clear();
    await this.databaseService.db.monthlyStatistics.clear();
  }
}
