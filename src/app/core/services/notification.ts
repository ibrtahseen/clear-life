import { Service, inject, signal } from '@angular/core';
import { UserStore } from './user-store';
import { SettingsStore } from './settings-store';
import { Prayer } from './prayer';
import { Habit } from './habit';
import { NotificationRepository } from '../data/repositories/notification-repository';
import { NotificationKind } from '../models/notification.model';
import { I18n } from './i18n';
import { formatTime, minutesSinceMidnight, parseHHmmToMinutes } from '../utils/date.util';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

@Service()
export class Notification {
  private readonly userStore = inject(UserStore);
  private readonly settingsStore = inject(SettingsStore);
  private readonly prayer = inject(Prayer);
  private readonly habit = inject(Habit);
  private readonly notificationRepository = inject(NotificationRepository);
  private readonly i18n = inject(I18n);

  readonly permission = signal<NotificationPermissionState>(this.readPermission());
  private readonly notifiedKeys = new Set<string>();
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  isSupported(): boolean {
    return typeof globalThis !== 'undefined' && 'Notification' in globalThis;
  }

  private readPermission(): NotificationPermissionState {
    if (!this.isSupported()) return 'unsupported';
    return globalThis.Notification.permission as NotificationPermissionState;
  }

  async requestPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) return 'unsupported';
    const result = await globalThis.Notification.requestPermission();
    this.permission.set(result as NotificationPermissionState);
    return result as NotificationPermissionState;
  }

  startScheduler(): void {
    if (this.intervalHandle) return;
    this.checkDueReminders();
    this.intervalHandle = setInterval(() => this.checkDueReminders(), 60_000);
  }

  stopScheduler(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private async checkDueReminders(): Promise<void> {
    const settings = this.settingsStore.settings();
    const nowMinutes = minutesSinceMidnight(new Date());

    if (settings.notifications.prayerRemindersEnabled) {
      const schedule = this.prayer.schedule();
      if (schedule) {
        for (const [name, time] of Object.entries(schedule.times)) {
          const target = parseHHmmToMinutes(time) - settings.notifications.reminderLeadMinutes;
          if (target === nowMinutes) {
            await this.fire(`prayer:${schedule.date}:${name}`, 'prayer', name, this.prayerMessage(name, time));
          }
        }
      }
    }

    if (settings.notifications.habitRemindersEnabled) {
      for (const habit of this.habit.todaysHabits()) {
        if (!habit.reminderTime || !habit.id) continue;
        if (parseHHmmToMinutes(habit.reminderTime) === nowMinutes) {
          const completed = this.habit.completionMap().get(habit.id) ?? false;
          if (!completed) {
            await this.fire(
              `habit:${new Date().toDateString()}:${habit.id}`,
              'habit',
              String(habit.id),
              this.habitMessage(habit.title),
            );
          }
        }
      }
    }
  }

  private prayerMessage(prayerName: string, time: string): string {
    const name = this.userStore.profile()?.name;
    const capitalized = prayerName.charAt(0).toUpperCase() + prayerName.slice(1);
    const timeLabel = formatTime(time);
    return name
      ? this.i18n.instant('notifications.prayerReminderNamed', { name, prayer: capitalized, time: timeLabel })
      : this.i18n.instant('notifications.prayerReminder', { prayer: capitalized, time: timeLabel });
  }

  private habitMessage(title: string): string {
    const name = this.userStore.profile()?.name;
    return name
      ? this.i18n.instant('notifications.habitReminderNamed', { name, habit: title })
      : this.i18n.instant('notifications.habitReminder', { habit: title });
  }

  /** Public so other features (e.g. Stay Focus) can reuse the same permission-gated notification path. */
  async fire(key: string, kind: NotificationKind, refId: string, body: string): Promise<void> {
    if (this.notifiedKeys.has(key)) return;
    this.notifiedKeys.add(key);

    const title = this.i18n.instant('app.name');
    await this.notificationRepository.add({
      kind,
      refId,
      title,
      body,
      scheduledAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
    });

    if (this.isSupported() && globalThis.Notification.permission === 'granted') {
      const registration = await this.getServiceWorkerRegistration();
      if (registration) {
        await registration.showNotification(title, { body, icon: 'icons/icon-192x192.png' });
      } else {
        new globalThis.Notification(title, { body, icon: 'icons/icon-192x192.png' });
      }
    }
  }

  private async getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return null;
    try {
      return await navigator.serviceWorker.ready;
    } catch {
      return null;
    }
  }
}
