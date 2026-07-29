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

export interface StepOption<T> {
  label: string;
  value: T;
  icon?: string;
}

/** Shared between onboarding and settings so the two option lists never drift apart. */
export const LANGUAGE_OPTIONS: StepOption<Language>[] = [
  { label: 'English', value: 'en' },
  { label: 'العربية', value: 'ar' },
];

export const THEME_OPTIONS: StepOption<ThemeMode>[] = [
  { label: 'Light', value: 'light', icon: 'light_mode' },
  { label: 'Dark', value: 'dark', icon: 'dark_mode' },
  { label: 'System', value: 'system', icon: 'desktop_windows' },
];

export const WEEK_DAY_OPTIONS: StepOption<WeekDay>[] = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Saturday', value: 6 },
];
