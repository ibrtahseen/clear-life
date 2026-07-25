export type Language = 'en' | 'ar';

export type ThemeMode = 'light' | 'dark' | 'system';

/** 0 = Sunday .. 6 = Saturday, matching JS Date#getDay() */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type LocationType = 'gps' | 'manual';

export interface GeoLocation {
  type: LocationType;
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  timezone?: string;
}

/** ISO calendar date string, e.g. "2026-07-25" */
export type IsoDate = string;

export type HabitCategory =
  | 'health'
  | 'reading'
  | 'exercise'
  | 'study'
  | 'work'
  | 'personal'
  | 'spirituality'
  | 'finance'
  | 'family'
  | 'social'
  | 'creativity'
  | 'sleep'
  | 'nutrition'
  | 'mindfulness'
  | 'custom';

export const HABIT_CATEGORIES: HabitCategory[] = [
  'health',
  'reading',
  'exercise',
  'study',
  'work',
  'personal',
  'spirituality',
  'finance',
  'family',
  'social',
  'creativity',
  'sleep',
  'nutrition',
  'mindfulness',
  'custom',
];
