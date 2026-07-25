import { Service, inject } from '@angular/core';
import { UserRepository } from '../data/repositories/user-repository';
import { SettingsRepository } from '../data/repositories/settings-repository';
import { HabitRepository } from '../data/repositories/habit-repository';
import { HabitHistoryRepository } from '../data/repositories/habit-history-repository';
import { PrayerHistoryRepository } from '../data/repositories/prayer-history-repository';
import { QuranRepository } from '../data/repositories/quran-repository';
import { StatisticsRepository } from '../data/repositories/statistics-repository';
import { NotificationRepository } from '../data/repositories/notification-repository';
import { CalendarRepository } from '../data/repositories/calendar-repository';
import { AppStateRepository } from '../data/repositories/app-state-repository';
import { BACKUP_SCHEMA_VERSION, ClearLifeBackup } from '../models/backup.model';

export const APP_VERSION = '1.0.0';

export class BackupValidationError extends Error {}

@Service()
export class Backup {
  private readonly userRepository = inject(UserRepository);
  private readonly settingsRepository = inject(SettingsRepository);
  private readonly habitRepository = inject(HabitRepository);
  private readonly habitHistoryRepository = inject(HabitHistoryRepository);
  private readonly prayerHistoryRepository = inject(PrayerHistoryRepository);
  private readonly quranRepository = inject(QuranRepository);
  private readonly statisticsRepository = inject(StatisticsRepository);
  private readonly notificationRepository = inject(NotificationRepository);
  private readonly calendarRepository = inject(CalendarRepository);
  private readonly appStateRepository = inject(AppStateRepository);

  async buildBackup(): Promise<ClearLifeBackup> {
    const [
      user,
      settings,
      habits,
      habitHistory,
      prayerHistory,
      quranProgress,
      quranReadingLog,
      weeklyStatistics,
      monthlyStatistics,
      notifications,
      calendarNotes,
      appState,
    ] = await Promise.all([
      this.userRepository.get(),
      this.settingsRepository.get(),
      this.habitRepository.getAll(),
      this.habitHistoryRepository.getAll(),
      this.prayerHistoryRepository.getAll(),
      this.quranRepository.getProgress(),
      this.quranRepository.getLog(),
      this.statisticsRepository.getAllWeekly(),
      this.statisticsRepository.getAllMonthly(),
      this.notificationRepository.getAll(),
      this.calendarRepository.getAll(),
      this.appStateRepository.get(),
    ]);

    return {
      backupVersion: BACKUP_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        user: user ?? null,
        settings,
        habits,
        habitHistory,
        prayerHistory,
        quranProgress,
        quranReadingLog,
        weeklyStatistics,
        monthlyStatistics,
        notifications,
        calendarNotes,
        appState,
      },
    };
  }

  async exportToFile(): Promise<string> {
    const backup = await this.buildBackup();
    const dateSuffix = backup.exportedAt.slice(0, 10);
    const filename = `ClearLife_Backup_${dateSuffix}.json`;
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return filename;
  }

  async parseFile(file: File): Promise<ClearLifeBackup> {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new BackupValidationError('The selected file is not valid JSON.');
    }
    this.validate(parsed);
    return parsed as ClearLifeBackup;
  }

  private validate(payload: unknown): asserts payload is ClearLifeBackup {
    if (!payload || typeof payload !== 'object') {
      throw new BackupValidationError('Backup file is empty or malformed.');
    }
    const obj = payload as Record<string, unknown>;
    if (typeof obj['backupVersion'] !== 'number') {
      throw new BackupValidationError('Backup file is missing a schema version.');
    }
    if (obj['backupVersion'] > BACKUP_SCHEMA_VERSION) {
      throw new BackupValidationError(
        'This backup was created by a newer version of Clear Life. Please update the app first.',
      );
    }
    if (!obj['data'] || typeof obj['data'] !== 'object') {
      throw new BackupValidationError('Backup file is missing its data section.');
    }
    const requiredKeys = [
      'habits',
      'habitHistory',
      'prayerHistory',
      'quranReadingLog',
      'notifications',
      'calendarNotes',
    ];
    const data = obj['data'] as Record<string, unknown>;
    for (const key of requiredKeys) {
      if (!(key in data) || !Array.isArray(data[key])) {
        throw new BackupValidationError(`Backup file is missing required data: ${key}.`);
      }
    }
  }

  /** Destructive: wipes all local data and restores everything from the backup. */
  async restore(backup: ClearLifeBackup): Promise<void> {
    const migrated = this.migrate(backup);
    const { data } = migrated;

    await Promise.all([
      this.userRepository.clear(),
      this.settingsRepository.clear(),
      this.habitRepository.clear(),
      this.habitHistoryRepository.clear(),
      this.prayerHistoryRepository.clear(),
      this.quranRepository.clear(),
      this.statisticsRepository.clear(),
      this.notificationRepository.clear(),
      this.calendarRepository.clear(),
      this.appStateRepository.clear(),
    ]);

    if (data.user) await this.userRepository.replace(data.user);
    if (data.settings) await this.settingsRepository.replace(data.settings);
    await this.habitRepository.bulkPut(data.habits);
    await this.habitHistoryRepository.bulkPut(data.habitHistory);
    await this.prayerHistoryRepository.bulkPut(data.prayerHistory);
    if (data.quranProgress) await this.quranRepository.saveProgress(data.quranProgress);
    await this.quranRepository.bulkPutLog(data.quranReadingLog);
    await this.statisticsRepository.bulkPutWeekly(data.weeklyStatistics);
    await this.statisticsRepository.bulkPutMonthly(data.monthlyStatistics);
    await this.notificationRepository.bulkPut(data.notifications);
    await this.calendarRepository.bulkPut(data.calendarNotes);
    if (data.appState) await this.appStateRepository.save({ ...data.appState, onboardingCompleted: true });
  }

  /** Hook point for future schema migrations between backupVersion releases. */
  private migrate(backup: ClearLifeBackup): ClearLifeBackup {
    return backup;
  }
}
