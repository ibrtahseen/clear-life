import Dexie, { Table } from 'dexie';
import { UserProfile } from '../models/user.model';
import { AppSettings } from '../models/settings.model';
import { Habit, HabitHistoryEntry } from '../models/habit.model';
import { PrayerHistoryEntry } from '../models/prayer.model';
import { QuranProgressState, QuranReadingLogEntry } from '../models/quran.model';
import { WeeklyStatisticsSnapshot, MonthlyStatisticsSnapshot } from '../models/statistics.model';
import { NotificationLogEntry, CalendarNote, AppState } from '../models/notification.model';
import { Category } from '../models/category.model';
import { FocusCountdown } from '../models/focus.model';

/**
 * Central IndexedDB database for Clear Life.
 * Schema versions are additive-only; bump `.version(n)` and provide an
 * `.upgrade()` callback whenever a future migration needs to transform data,
 * so existing installs migrate forward without data loss.
 */
export class ClearLifeDatabase extends Dexie {
  user!: Table<UserProfile, number>;
  settings!: Table<AppSettings, number>;
  habits!: Table<Habit, number>;
  habitHistory!: Table<HabitHistoryEntry, number>;
  prayerHistory!: Table<PrayerHistoryEntry, number>;
  quranProgress!: Table<QuranProgressState, number>;
  quranReadingLog!: Table<QuranReadingLogEntry, number>;
  weeklyStatistics!: Table<WeeklyStatisticsSnapshot, number>;
  monthlyStatistics!: Table<MonthlyStatisticsSnapshot, number>;
  notifications!: Table<NotificationLogEntry, number>;
  calendarNotes!: Table<CalendarNote, number>;
  appState!: Table<AppState, number>;
  categories!: Table<Category, number>;
  focusCountdowns!: Table<FocusCountdown, number>;

  constructor() {
    super('ClearLifeDB');

    this.version(1).stores({
      user: 'id',
      settings: 'id',
      habits: '++id, category, archived',
      habitHistory: '++id, habitId, date, [habitId+date]',
      prayerHistory: '++id, date, prayerName, [date+prayerName]',
      quranProgress: 'id',
      quranReadingLog: '++id, date, prayerName',
      weeklyStatistics: '++id, weekStart',
      monthlyStatistics: '++id, [year+month]',
      notifications: '++id, kind, scheduledAt',
      calendarNotes: '++id, &date',
      appState: 'id',
    });

    this.version(2).stores({
      categories: '++id',
      focusCountdowns: '++id',
    });
  }
}
