import { HabitCategory, IsoDate } from './common.model';

export interface CompletionSummary {
  totalScheduled: number;
  totalCompleted: number;
  rate: number;
}

export interface CategoryCompletion {
  category: HabitCategory;
  summary: CompletionSummary;
}

export interface StreakInfo {
  current: number;
  longest: number;
}

export interface HeatmapDay {
  date: IsoDate;
  rate: number;
}

export interface WeeklyStatisticsSnapshot {
  id?: number;
  weekStart: IsoDate;
  weekEnd: IsoDate;
  habitCompletion: CompletionSummary;
  prayerCompletion: CompletionSummary;
  categoryBreakdown: CategoryCompletion[];
  createdAt: string;
}

export interface MonthlyStatisticsSnapshot {
  id?: number;
  month: number;
  year: number;
  habitCompletion: CompletionSummary;
  prayerCompletion: CompletionSummary;
  categoryBreakdown: CategoryCompletion[];
  createdAt: string;
}
