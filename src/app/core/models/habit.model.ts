import { HabitCategory, IsoDate, WeekDay } from './common.model';

export interface Habit {
  id?: number;
  title: string;
  icon: string;
  color: string;
  category: HabitCategory;
  customCategoryId?: number | null;
  schedule: WeekDay[];
  reminderTime: string | null;
  archived: boolean;
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
