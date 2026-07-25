import { UserProfile } from './user.model';
import { AppSettings } from './settings.model';
import { Habit, HabitHistoryEntry } from './habit.model';
import { PrayerHistoryEntry } from './prayer.model';
import { QuranProgressState, QuranReadingLogEntry } from './quran.model';
import { WeeklyStatisticsSnapshot, MonthlyStatisticsSnapshot } from './statistics.model';
import { NotificationLogEntry, CalendarNote, AppState } from './notification.model';

export const BACKUP_SCHEMA_VERSION = 1;

export interface ClearLifeBackup {
  backupVersion: number;
  appVersion: string;
  exportedAt: string;
  data: {
    user: UserProfile | null;
    settings: AppSettings | null;
    habits: Habit[];
    habitHistory: HabitHistoryEntry[];
    prayerHistory: PrayerHistoryEntry[];
    quranProgress: QuranProgressState | null;
    quranReadingLog: QuranReadingLogEntry[];
    weeklyStatistics: WeeklyStatisticsSnapshot[];
    monthlyStatistics: MonthlyStatisticsSnapshot[];
    notifications: NotificationLogEntry[];
    calendarNotes: CalendarNote[];
    appState: AppState | null;
  };
}
