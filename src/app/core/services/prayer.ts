import { Service, computed, inject, signal } from '@angular/core';
import { PrayerApi } from './prayer-api';
import { SettingsStore } from './settings-store';
import { PrayerHistoryRepository } from '../data/repositories/prayer-history-repository';
import { AppStateRepository } from '../data/repositories/app-state-repository';
import { Quran } from './quran';
import { DailyPrayerSchedule, PRAYER_NAMES, PrayerHistoryEntry, PrayerName } from '../models/prayer.model';
import { todayIso } from '../utils/date.util';

const CACHE_PREFIX = 'clear-life:prayer-schedule:';

@Service()
export class Prayer {
  private readonly prayerApi = inject(PrayerApi);
  private readonly settingsStore = inject(SettingsStore);
  private readonly prayerHistoryRepository = inject(PrayerHistoryRepository);
  private readonly appStateRepository = inject(AppStateRepository);
  private readonly quran = inject(Quran);

  readonly schedule = signal<DailyPrayerSchedule | null>(null);
  readonly todayHistory = signal<PrayerHistoryEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly completionMap = computed(() => {
    const map = new Map<PrayerName, boolean>();
    for (const entry of this.todayHistory()) {
      map.set(entry.prayerName, entry.completed);
    }
    return map;
  });

  readonly nextPrayer = computed<{ name: PrayerName; time: string } | null>(() => {
    const schedule = this.schedule();
    if (!schedule) return null;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    for (const name of PRAYER_NAMES) {
      const time = schedule.times[name];
      const [h, m] = time.split(':').map(Number);
      if (h * 60 + m >= nowMinutes) {
        return { name, time };
      }
    }
    return { name: PRAYER_NAMES[0], time: schedule.times[PRAYER_NAMES[0]] };
  });

  async loadToday(): Promise<void> {
    const date = todayIso();
    await Promise.all([this.loadSchedule(date), this.loadHistory(date)]);
  }

  private async loadHistory(date: string): Promise<void> {
    const history = await this.prayerHistoryRepository.getForDate(date);
    this.todayHistory.set(history);
  }

  private async loadSchedule(date: string): Promise<void> {
    const settings = this.settingsStore.settings();
    const location = settings.location;

    const cached = this.readCache(date);
    if (cached) {
      this.schedule.set(cached);
    }
    if (!location) {
      this.error.set('no-location');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    try {
      const times = await this.prayerApi.fetchDailyTimes({
        latitude: location.latitude,
        longitude: location.longitude,
        date,
        timezone: location.timezone,
      });
      const fresh: DailyPrayerSchedule = {
        date,
        times,
        fetchedAt: new Date().toISOString(),
        source: 'api',
      };
      this.schedule.set(fresh);
      this.writeCache(date, fresh);
      await this.appStateRepository.patch({ lastPrayerSyncDate: date });
    } catch {
      if (!cached) {
        this.error.set('fetch-failed');
      }
    } finally {
      this.loading.set(false);
    }
  }

  async refreshLocation(): Promise<void> {
    await this.loadSchedule(todayIso());
  }

  async toggleCompletion(prayerName: PrayerName): Promise<void> {
    const date = todayIso();
    const wasCompleted = this.completionMap().get(prayerName) ?? false;
    const scheduledTime = this.schedule()?.times[prayerName] ?? null;
    const entry = await this.prayerHistoryRepository.setCompletion(date, prayerName, !wasCompleted, scheduledTime);

    const updated = this.todayHistory().filter((e) => e.prayerName !== prayerName);
    updated.push(entry);
    this.todayHistory.set(updated);

    if (!wasCompleted) {
      await this.quran.awardPagesForPrayer(date, prayerName);
    } else {
      await this.quran.revokePagesForPrayer(date, prayerName);
    }
  }

  private cacheKey(date: string): string {
    return `${CACHE_PREFIX}${date}`;
  }

  private readCache(date: string): DailyPrayerSchedule | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(this.cacheKey(date));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as DailyPrayerSchedule;
      return { ...parsed, source: 'cache' };
    } catch {
      return null;
    }
  }

  private writeCache(date: string, schedule: DailyPrayerSchedule): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.cacheKey(date), JSON.stringify(schedule));
  }
}
