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
  habitTotal: number;
  habitCompleted: number;
  prayerTotal: number;
  prayerCompleted: number;
}

export type InsightTone = 'positive' | 'negative' | 'neutral';

export type InsightKind = 'bestWeekday' | 'focusWindow' | 'timeOfDayGap' | 'monthComparison' | 'bestHabit';

export interface Insight {
  kind: InsightKind;
  tone: InsightTone;
  params: Record<string, string | number>;
}
