import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';

import { UserStore } from '../../../core/services/user-store';
import { SettingsStore } from '../../../core/services/settings-store';
import { Prayer as PrayerService } from '../../../core/services/prayer';
import { Habit as HabitService } from '../../../core/services/habit';
import { Quran as QuranService } from '../../../core/services/quran';
import { Statistics as StatisticsService } from '../../../core/services/statistics';
import { Clock } from '../../../core/services/clock';
import { PRAYER_NAMES, PrayerName } from '../../../core/models/prayer.model';
import { formatHijri } from '../../../core/utils/hijri.util';
import { formatTime, minutesSinceMidnight, parseHHmmToMinutes, todayIso } from '../../../core/utils/date.util';
import {
  QuranReaderDialog,
  QuranReaderDialogData,
} from '../../prayers/quran-reader-dialog/quran-reader-dialog';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, TranslatePipe, DatePipe, MatIconModule, EmptyState],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly userStore = inject(UserStore);
  private readonly settingsStore = inject(SettingsStore);
  private readonly prayerService = inject(PrayerService);
  private readonly habitService = inject(HabitService);
  private readonly quranService = inject(QuranService);
  private readonly statisticsService = inject(StatisticsService);
  private readonly clock = inject(Clock);
  private readonly dialog = inject(MatDialog);

  readonly prayerNames = PRAYER_NAMES;
  readonly userName = computed(() => this.userStore.profile()?.name ?? '');
  readonly today = computed(() => new Date(this.clock.now()));
  readonly hijriDate = computed(() => formatHijri(this.today(), this.settingsStore.settings().language));

  readonly greetingKey = computed(() => {
    const hour = this.today().getHours();
    if (hour < 12) return 'dashboard.greetingMorning';
    if (hour < 18) return 'dashboard.greetingAfternoon';
    return 'dashboard.greetingEvening';
  });

  readonly schedule = this.prayerService.schedule;
  readonly prayerCompletionMap = this.prayerService.completionMap;
  readonly nextPrayer = this.prayerService.nextPrayer;
  readonly countdownLabel = this.prayerService.countdownLabel;

  readonly todaysHabits = this.habitService.todaysHabits;
  readonly habitCompletionMap = this.habitService.completionMap;

  readonly quranProgress = this.quranService.progress;

  readonly upcomingReminders = computed(() => {
    const nowMinutes = minutesSinceMidnight(this.today());
    return this.todaysHabits()
      .filter((h) => h.reminderTime && !this.habitCompletionMap().get(h.id!))
      .filter((h) => parseHHmmToMinutes(h.reminderTime!) >= nowMinutes)
      .sort((a, b) => a.reminderTime!.localeCompare(b.reminderTime!));
  });

  private readonly weeklyStatsResource = resource({
    params: () => ({ firstDayOfWeek: this.settingsStore.settings().firstDayOfWeek }),
    loader: ({ params }) => this.statisticsService.weeklyCompletion(new Date(), params.firstDayOfWeek),
  });
  readonly weeklyStats = this.weeklyStatsResource.value;

  private readonly prayerStreakResource = resource({
    params: () => ({}),
    loader: () => this.statisticsService.prayerStreak(),
  });
  readonly prayerStreak = this.prayerStreakResource.value;

  constructor() {
    void this.prayerService.loadToday();
    void this.habitService.init();
    void this.quranService.init();
  }

  isPrayerCompleted(name: PrayerName): boolean {
    return this.prayerCompletionMap().get(name) ?? false;
  }

  /**
   * Marking a prayer done from the dashboard opens the Quran reader first —
   * completion (and the page award) happens when the user finishes reading.
   * Un-marking an already-completed prayer just un-marks it directly.
   */
  async togglePrayer(name: PrayerName): Promise<void> {
    if (this.isPrayerCompleted(name)) {
      await this.prayerService.toggleCompletion(name);
      return;
    }

    const completed = new Set(this.prayerNames.filter((n) => this.isPrayerCompleted(n)));
    const ranges = await this.quranService.pageRangesForDate(todayIso(), completed);
    const range = ranges[name];
    if (!range) {
      await this.prayerService.toggleCompletion(name);
      return;
    }

    const data: QuranReaderDialogData = {
      pages: this.quranService.expandRange(range),
      prayerName: name,
      alreadyCompleted: false,
    };
    this.dialog.open(QuranReaderDialog, { data, maxWidth: '95vw' });
  }

  isHabitCompleted(habitId: number): boolean {
    return this.habitCompletionMap().get(habitId) ?? false;
  }

  async toggleHabit(habitId: number): Promise<void> {
    await this.habitService.toggleToday(habitId);
  }

  formattedTime(time: string): string {
    return formatTime(time);
  }

  quranRangeLabel(): string {
    return this.quranService.currentRangeLabel();
  }
}
