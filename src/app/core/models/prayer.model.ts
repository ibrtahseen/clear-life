import { IsoDate } from './common.model';

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export const PRAYER_NAMES: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export interface DailyPrayerSchedule {
  date: IsoDate;
  times: Record<PrayerName, string>;
  fetchedAt: string;
  source: 'api' | 'cache';
}

export interface PrayerHistoryEntry {
  id?: number;
  date: IsoDate;
  prayerName: PrayerName;
  completed: boolean;
  scheduledTime: string | null;
  completedAt: string | null;
}
