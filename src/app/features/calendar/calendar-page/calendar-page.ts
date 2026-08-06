import { ChangeDetectionStrategy, Component, computed, inject, resource, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import dayjs from 'dayjs';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';

import { SettingsStore } from '../../../core/services/settings-store';
import { Statistics as StatisticsService } from '../../../core/services/statistics';
import { Clock } from '../../../core/services/clock';
import { I18n } from '../../../core/services/i18n';
import { HabitRepository } from '../../../core/data/repositories/habit-repository';
import { HabitHistoryRepository } from '../../../core/data/repositories/habit-history-repository';
import { PrayerHistoryRepository } from '../../../core/data/repositories/prayer-history-repository';
import { FocusSessionRepository } from '../../../core/data/repositories/focus-session-repository';
import { PRAYER_NAMES } from '../../../core/models/prayer.model';
import { WeekDay } from '../../../core/models/common.model';
import { toIsoDate, startOfWeek, formatDuration, formatTime } from '../../../core/utils/date.util';

interface CalendarDay {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  habitTotal: number;
  habitCompleted: number;
  prayerTotal: number;
  prayerCompleted: number;
  focusSeconds: number;
}

interface CalendarWeek {
  start: string;
  label: string;
  isCurrent: boolean;
  days: CalendarDay[];
}

/** The 42-day (6-week) grid range covering `month`, starting on `firstDayOfWeek`. */
function monthGridRange(month: string, firstDayOfWeek: WeekDay): { start: dayjs.Dayjs; end: dayjs.Dayjs } {
  const monthStart = dayjs(`${month}-01`);
  const start = startOfWeek(monthStart, firstDayOfWeek);
  return { start, end: start.add(41, 'day') };
}

@Component({
  selector: 'app-calendar-page',
  imports: [TranslatePipe, MatButtonModule, MatIconModule, EmptyState],
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
  private readonly clock = inject(Clock);
  private readonly translate = inject(TranslateService);
  private readonly i18n = inject(I18n);

  readonly prayerNames = PRAYER_NAMES;
  readonly viewDate = signal(dayjs());
  readonly selectedDate = signal(toIsoDate());
  readonly todayIso = computed(() => toIsoDate(new Date(this.clock.now())));

  readonly monthLabel = computed(() => this.viewDate().format('MMMM YYYY'));

  private readonly firstDayOfWeek = computed(() => this.settingsStore.settings().firstDayOfWeek);

  readonly weekdayHeaders = computed(() => {
    this.i18n.language();
    const first = this.firstDayOfWeek();
    return Array.from({ length: 7 }, (_, i) =>
      this.translate.instant(`habits.weekdayShort.${(first + i) % 7}`),
    );
  });

  private readonly heatmapResource = resource({
    params: () => ({ month: this.viewDate().format('YYYY-MM'), firstDayOfWeek: this.firstDayOfWeek() }),
    loader: async ({ params }) => {
      const { start, end } = monthGridRange(params.month, params.firstDayOfWeek as WeekDay);
      return this.statisticsService.heatmap(toIsoDate(start), toIsoDate(end));
    },
  });

  private readonly focusResource = resource({
    params: () => ({ month: this.viewDate().format('YYYY-MM'), firstDayOfWeek: this.firstDayOfWeek() }),
    loader: async ({ params }) => {
      const { start, end } = monthGridRange(params.month, params.firstDayOfWeek as WeekDay);
      return this.statisticsService.focusSecondsByDay(toIsoDate(start), toIsoDate(end));
    },
  });

  readonly days = computed<CalendarDay[]>(() => {
    const view = this.viewDate();
    const monthStart = view.startOf('month');
    const { start: gridStart } = monthGridRange(view.format('YYYY-MM'), this.firstDayOfWeek());
    const heatmapByDate = new Map((this.heatmapResource.value() ?? []).map((d) => [d.date, d]));
    const focusByDate = new Map((this.focusResource.value() ?? []).map((d) => [d.date, d.seconds]));
    const todayIso = this.todayIso();

    return Array.from({ length: 42 }, (_, i) => {
      const date = gridStart.add(i, 'day');
      const iso = toIsoDate(date);
      const heat = heatmapByDate.get(iso);
      return {
        date: iso,
        dayNumber: date.date(),
        isCurrentMonth: date.month() === monthStart.month(),
        isToday: iso === todayIso,
        isFuture: iso > todayIso,
        habitTotal: heat?.habitTotal ?? 0,
        habitCompleted: heat?.habitCompleted ?? 0,
        prayerTotal: heat?.prayerTotal ?? 0,
        prayerCompleted: heat?.prayerCompleted ?? 0,
        focusSeconds: focusByDate.get(iso) ?? 0,
      };
    });
  });

  /** The month grid grouped into its 6 week rows, each independently selectable. */
  readonly weeks = computed<CalendarWeek[]>(() => {
    const all = this.days();
    const todayIso = this.todayIso();
    const weeks: CalendarWeek[] = [];
    for (let i = 0; i < all.length; i += 7) {
      const chunk = all.slice(i, i + 7);
      const start = dayjs(chunk[0].date);
      const end = dayjs(chunk[6].date);
      weeks.push({
        start: chunk[0].date,
        label: `${start.format('MMM D')} – ${end.format('MMM D')}`,
        isCurrent: chunk.some((d) => d.date === todayIso),
        days: chunk,
      });
    }
    return weeks;
  });

  /** Week row containing the currently selected day — drives the active-row highlight. */
  readonly selectedWeekStart = computed(() => {
    const date = this.selectedDate();
    return this.weeks().find((w) => w.days.some((d) => d.date === date))?.start ?? null;
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

  /** Jumps to a week row: lands on today if it falls in that week, else the week's first day. */
  selectWeek(week: CalendarWeek): void {
    const todayInWeek = week.days.find((d) => d.date === this.todayIso());
    this.selectDay(todayInWeek ? todayInWeek.date : week.days[0].date);
  }

  private rateClass(total: number, completed: number): string {
    if (total === 0) return 'heat-none';
    const rate = (completed / total) * 100;
    if (rate === 0) return 'heat-0';
    if (rate < 40) return 'heat-1';
    if (rate < 70) return 'heat-2';
    if (rate < 100) return 'heat-3';
    return 'heat-4';
  }

  habitDotClass(day: CalendarDay): string {
    return this.rateClass(day.habitTotal, day.habitCompleted);
  }

  prayerDotClass(day: CalendarDay): string {
    return this.rateClass(day.prayerTotal, day.prayerCompleted);
  }

  habitDotTitle(day: CalendarDay): string {
    return this.translate.instant('calendar.habitsTooltip', { completed: day.habitCompleted, total: day.habitTotal });
  }

  prayerDotTitle(day: CalendarDay): string {
    return this.translate.instant('calendar.prayersTooltip', {
      completed: day.prayerCompleted,
      total: day.prayerTotal,
    });
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
