export type NotificationKind = 'prayer' | 'habit' | 'focus';

export interface NotificationLogEntry {
  id?: number;
  kind: NotificationKind;
  refId: number | string;
  title: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
}

export interface CalendarNote {
  id?: number;
  date: string;
  note: string;
  updatedAt: string;
}

export interface AppState {
  id: number;
  onboardingCompleted: boolean;
  schemaVersion: number;
  lastPrayerSyncDate: string | null;
  lastOpenedAt: string;
}
