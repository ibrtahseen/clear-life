import { GeoLocation, Language, ThemeMode, WeekDay } from './common.model';

export interface NotificationSettings {
  prayerRemindersEnabled: boolean;
  habitRemindersEnabled: boolean;
  reminderLeadMinutes: number;
}

export interface AppSettings {
  id: number;
  language: Language;
  theme: ThemeMode;
  firstDayOfWeek: WeekDay;
  location: GeoLocation | null;
  notifications: NotificationSettings;
  quranPagePerPry: number;
  updatedAt: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  prayerRemindersEnabled: true,
  habitRemindersEnabled: true,
  reminderLeadMinutes: 10,
};
