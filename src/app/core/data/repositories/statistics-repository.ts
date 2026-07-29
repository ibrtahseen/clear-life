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
