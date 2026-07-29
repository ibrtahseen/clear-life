import { ChangeDetectionStrategy, Component, computed, inject, resource, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import dayjs from 'dayjs';

import { SettingsStore } from '../../../core/services/settings-store';
import { Statistics as StatisticsService } from '../../../core/services/statistics';
import { HabitRepository } from '../../../core/data/repositories/habit-repository';
import { HabitHistoryRepository } from '../../../core/data/repositories/habit-history-repository';
import { PrayerHistoryRepository } from '../../../core/data/repositories/prayer-history-repository';
import { FocusSessionRepository } from '../../../core/data/repositories/focus-session-repository';
import { PRAYER_NAMES } from '../../../core/models/prayer.model';
import { WeekDay } from '../../../core/models/common.model';
import { toIsoDate, startOfWeek, formatDuration, formatTime } from '../../../core/utils/date.util';
import { formatHijri, toHijri } from '../../../core/utils/hijri.util';

interface CalendarDay {
  date: string;
  dayNumber: number;
  hijriDay: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  rate: number;
  focusSeconds: number;
}

@Component({
  selector: 'app-calendar-page',
  imports: [TranslatePipe, MatButtonModule, MatIconModule],
  templateUrl: './calendar-page.html',
  styleUrl: './calendar-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  private readonly settingsStore = inject(SettingsStore);
  private readonly statisticsService = inject(StatisticsService);
  private readonly habitRepository = inject(HabitRepository);
  private readonly habitHistoryRepository = inject(HabitHistoryRepository);
  private readonly prayerHistoryRepository = inject(PrayerHistoryRepository);
  private readonly focusSessionRepository = inject(FocusSessionRepository);

  readonly prayerNames = PRAYER_NAMES;
  readonly viewDate = signal(dayjs());
  readonly selectedDate = signal(toIsoDate());
  readonly todayIso = toIsoDate();

  readonly monthLabel = computed(() => this.viewDate().format('MMMM YYYY'));
  readonly hijriMonthLabel = computed(() => formatHijri(this.viewDate().toDate(), this.settingsStore.settings().language));

  private readonly firstDayOfWeek = computed(() => this.settingsStore.settings().firstDayOfWeek);

  private static readonly WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly weekdayHeaders = computed(() => {
    const first = this.firstDayOfWeek();
    return Array.from(
      { length: 7 },
      (_, i) => CalendarPage.WEEKDAY_NAMES[(first + i) % 7],
    );
  });

  private readonly heatmapResource = resource({
    params: () => ({ month: this.viewDate().format('YYYY-MM'), firstDayOfWeek: this.firstDayOfWeek() }),
    loader: async ({ params }) => {
      const monthStart = dayjs(params.month + '-01');
      const gridStart = startOfWeek(monthStart, params.firstDayOfWeek as WeekDay);
      const gridEnd = gridStart.add(41, 'day');
      return this.statisticsService.heatmap(toIsoDate(gridStart), toIsoDate(gridEnd));
    },
  });

  private readonly focusResource = resource({
    params: () => ({ month: this.viewDate().format('YYYY-MM'), firstDayOfWeek: this.firstDayOfWeek() }),
    loader: async ({ params }) => {
      const monthStart = dayjs(params.month + '-01');
      const gridStart = startOfWeek(monthStart, params.firstDayOfWeek as WeekDay);
      const gridEnd = gridStart.add(41, 'day');
      return this.statisticsService.focusSecondsByDay(toIsoDate(gridStart), toIsoDate(gridEnd));
    },
  });

  readonly days = computed<CalendarDay[]>(() => {
    const view = this.viewDate();
    const monthStart = view.startOf('month');
    const gridStart = startOfWeek(monthStart, this.firstDayOfWeek());
    const rateByDate = new Map((this.heatmapResource.value() ?? []).map((d) => [d.date, d.rate]));
    const focusByDate = new Map((this.focusResource.value() ?? []).map((d) => [d.date, d.seconds]));

    return Array.from({ length: 42 }, (_, i) => {
      const date = gridStart.add(i, 'day');
      const iso = toIsoDate(date);
      return {
        date: iso,
        dayNumber: date.date(),
        hijriDay: toHijri(date.toDate()).day,
        isCurrentMonth: date.month() === monthStart.month(),
        isToday: iso === this.todayIso,
        rate: rateByDate.get(iso) ?? 0,
        focusSeconds: focusByDate.get(iso) ?? 0,
      };
    });
  });

  private readonly dayDetailResource = resource({
    params: () => ({ date: this.selectedDate() }),
    loader: async ({ params }) => {
      const weekday = dayjs(params.date).day() as WeekDay;
      const [allHabits, habitHistory, prayerHistory, focusSessions] = await Promise.all([
        this.habitRepository.getActive(),
        this.habitHistoryRepository.getForDate(params.date),
        this.prayerHistoryRepository.getForDate(params.date),
        this.focusSessionRepository.getForDate(params.date),
      ]);
      const scheduledHabits = allHabits.filter((h) => h.schedule.includes(weekday));
      const sortedSessions = focusSessions.slice().sort((a, b) => a.startedAt.localeCompare(b.startedAt));
      return {
        habits: scheduledHabits.map((h) => ({
          title: h.title,
          icon: h.icon,
          color: h.color,
          completed: habitHistory.find((e) => e.habitId === h.id)?.completed ?? false,
        })),
        prayers: PRAYER_NAMES.map((name) => ({
          name,
          completed: prayerHistory.find((p) => p.prayerName === name)?.completed ?? false,
        })),
        focusSessions: sortedSessions.map((s) => ({
          name: s.countdownName,
          durationSeconds: s.durationSeconds,
          startedAt: s.startedAt,
        })),
        focusTotalSeconds: sortedSessions.reduce((sum, s) => sum + s.durationSeconds, 0),
      };
    },
  });
  readonly dayDetail = this.dayDetailResource.value;

  previousMonth(): void {
    this.viewDate.set(this.viewDate().subtract(1, 'month'));
  }

  nextMonth(): void {
    this.viewDate.set(this.viewDate().add(1, 'month'));
  }

  selectDay(date: string): void {
    this.selectedDate.set(date);
  }

  heatClass(rate: number): string {
    if (rate === 0) return 'heat-0';
    if (rate < 40) return 'heat-1';
    if (rate < 70) return 'heat-2';
    if (rate < 100) return 'heat-3';
    return 'heat-4';
  }

  /** Compact "Nm"/"NhNm" form for the tight space inside a day cell. */
  focusCellLabel(seconds: number): string {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h${rest}m` : `${hours}h`;
  }

  formatFocusDuration(seconds: number): string {
    return formatDuration(seconds);
  }

  formatSessionTime(iso: string): string {
    return formatTime(iso);
  }
}
