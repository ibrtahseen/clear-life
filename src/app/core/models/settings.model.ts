import { GeoLocation, Language, ThemeMode, WeekDay } from './common.model';

export interface NotificationSettings {
  prayerRemindersEnabled: boolean;
  habitRemindersEnabled: boolean;
  /** Minutes before each habit's reminder time to notify */
  reminderLeadMinutes: number;
}

export interface AppSettings {
  /** Singleton row id, always 1 */
  id: number;
  language: Language;
  theme: ThemeMode;
  firstDayOfWeek: WeekDay;
  location: GeoLocation | null;
  notifications: NotificationSettings;
  prayerCalculationMethod: string;
  prayerMadhab: 'Hanafi' | 'Shafi';
  updatedAt: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  prayerRemindersEnabled: true,
  habitRemindersEnabled: true,
  reminderLeadMinutes: 10,
};
