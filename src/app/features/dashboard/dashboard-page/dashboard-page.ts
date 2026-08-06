import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';

import { UserStore } from '../../../core/services/user-store';
import { Prayer as PrayerService } from '../../../core/services/prayer';
import { Habit as HabitService } from '../../../core/services/habit';
import { Quran as QuranService } from '../../../core/services/quran';
import { Clock } from '../../../core/services/clock';
import { PRAYER_NAMES, PrayerName } from '../../../core/models/prayer.model';
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
  private readonly prayerService = inject(PrayerService);
  private readonly habitService = inject(HabitService);
  private readonly quranService = inject(QuranService);
  private readonly clock = inject(Clock);
  private readonly dialog = inject(MatDialog);

  readonly prayerNames = PRAYER_NAMES;
  readonly userName = computed(() => this.userStore.profile()?.name ?? '');
  readonly today = computed(() => new Date(this.clock.now()));

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

  readonly upcomingReminders = computed(() => {
    const nowMinutes = minutesSinceMidnight(this.today());
    return this.todaysHabits()
      .filter((h) => h.reminderTime && !this.habitCompletionMap().get(h.id!))
      .filter((h) => parseHHmmToMinutes(h.reminderTime!) >= nowMinutes)
      .sort((a, b) => a.reminderTime!.localeCompare(b.reminderTime!));
  });

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
}
