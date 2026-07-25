import { HabitCategory, IsoDate, WeekDay } from './common.model';

export interface Habit {
  id?: number;
  title: string;
  icon: string;
  color: string;
  category: HabitCategory;
  /** Days of week this habit is scheduled on */
  schedule: WeekDay[];
  reminderTime: string | null;
  archived: boolean;
  /** User-defined display/priority order; lower sorts first. */
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface HabitHistoryEntry {
  id?: number;
  habitId: number;
  date: IsoDate;
  completed: boolean;
  completedAt: string | null;
}
