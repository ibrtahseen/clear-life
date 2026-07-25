import { Service, inject } from '@angular/core';
import dayjs from 'dayjs';
import { HabitRepository } from '../data/repositories/habit-repository';
import { HabitHistoryRepository } from '../data/repositories/habit-history-repository';
import { PrayerHistoryRepository } from '../data/repositories/prayer-history-repository';
import { QuranRepository } from '../data/repositories/quran-repository';
import { Habit } from '../models/habit.model';
import { HabitCategory, IsoDate, WeekDay } from '../models/common.model';
import { PRAYER_NAMES } from '../models/prayer.model';
import {
  CategoryCompletion,
  CompletionSummary,
  HeatmapDay,
  StreakInfo,
} from '../models/statistics.model';
import { isoRange, startOfWeek, endOfWeek, toIsoDate } from '../utils/date.util';
import { QURAN_TOTAL_PAGES } from '../models/quran.model';

function summaryOf(scheduled: number, completed: number): CompletionSummary {
  return {
    totalScheduled: scheduled,
    totalCompleted: completed,
    rate: scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100),
  };
}

@Service()
export class Statistics {
  private readonly habitRepository = inject(HabitRepository);
  private readonly habitHistoryRepository = inject(HabitHistoryRepository);
  private readonly prayerHistoryRepository = inject(PrayerHistoryRepository);
  private readonly quranRepository = inject(QuranRepository);

  async habitCompletionForRange(start: IsoDate, end: IsoDate): Promise<CompletionSummary> {
    const habits = await this.habitRepository.getActive();
    const history = await this.habitHistoryRepository.getForRange(start, end);
    const days = isoRange(dayjs(start), dayjs(end));
    let scheduled = 0;
    let completed = 0;
    for (const date of days) {
      const weekday = dayjs(date).day() as WeekDay;
      const scheduledHabits = habits.filter((h) => h.schedule.includes(weekday) && h.createdAt.slice(0, 10) <= date);
      scheduled += scheduledHabits.length;
      for (const habit of scheduledHabits) {
        const entry = history.find((h) => h.habitId === habit.id && h.date === date);
        if (entry?.completed) completed++;
      }
    }
    return summaryOf(scheduled, completed);
  }

  async prayerCompletionForRange(start: IsoDate, end: IsoDate): Promise<CompletionSummary> {
    const history = await this.prayerHistoryRepository.getForRange(start, end);
    const days = isoRange(dayjs(start), dayjs(end));
    const scheduled = days.length * PRAYER_NAMES.length;
    const completed = history.filter((h) => h.completed).length;
    return summaryOf(scheduled, completed);
  }

  async weeklyCompletion(referenceDate: Date, firstDayOfWeek: WeekDay) {
    const start = startOfWeek(referenceDate, firstDayOfWeek);
    const end = endOfWeek(referenceDate, firstDayOfWeek);
    const [habit, prayer] = await Promise.all([
      this.habitCompletionForRange(toIsoDate(start), toIsoDate(end)),
      this.prayerCompletionForRange(toIsoDate(start), toIsoDate(end)),
    ]);
    return { start: toIsoDate(start), end: toIsoDate(end), habit, prayer };
  }

  async monthlyCompletion(year: number, month: number) {
    const start = dayjs(new Date(year, month - 1, 1));
    const end = start.endOf('month');
    const [habit, prayer] = await Promise.all([
      this.habitCompletionForRange(toIsoDate(start), toIsoDate(end)),
      this.prayerCompletionForRange(toIsoDate(start), toIsoDate(end)),
    ]);
    return { start: toIsoDate(start), end: toIsoDate(end), habit, prayer };
  }

  async yearlyCompletion(year: number) {
    const start = dayjs(new Date(year, 0, 1));
    const end = dayjs(new Date(year, 11, 31));
    const [habit, prayer] = await Promise.all([
      this.habitCompletionForRange(toIsoDate(start), toIsoDate(end)),
      this.prayerCompletionForRange(toIsoDate(start), toIsoDate(end)),
    ]);
    return { start: toIsoDate(start), end: toIsoDate(end), habit, prayer };
  }

  async categoryBreakdown(start: IsoDate, end: IsoDate): Promise<CategoryCompletion[]> {
    const habits = await this.habitRepository.getActive();
    const history = await this.habitHistoryRepository.getForRange(start, end);
    const days = isoRange(dayjs(start), dayjs(end));
    const byCategory = new Map<HabitCategory, { scheduled: number; completed: number }>();

    for (const habit of habits) {
      const bucket = byCategory.get(habit.category) ?? { scheduled: 0, completed: 0 };
      for (const date of days) {
        const weekday = dayjs(date).day() as WeekDay;
        if (!habit.schedule.includes(weekday)) continue;
        bucket.scheduled++;
        if (history.find((h) => h.habitId === habit.id && h.date === date)?.completed) {
          bucket.completed++;
        }
      }
      byCategory.set(habit.category, bucket);
    }

    return Array.from(byCategory.entries()).map(([category, { scheduled, completed }]) => ({
      category,
      summary: summaryOf(scheduled, completed),
    }));
  }

  async habitStreak(habit: Habit): Promise<StreakInfo> {
    const history = await this.habitHistoryRepository.getForHabit(habit.id!);
    return this.computeStreak(history.filter((h) => h.completed).map((h) => h.date), habit.schedule);
  }

  async prayerStreak(): Promise<StreakInfo> {
    const all = await this.prayerHistoryRepository.getAll();
    const byDate = new Map<string, number>();
    for (const entry of all) {
      if (!entry.completed) continue;
      byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + 1);
    }
    const fullyCompletedDates = Array.from(byDate.entries())
      .filter(([, count]) => count >= PRAYER_NAMES.length)
      .map(([date]) => date);
    return this.computeStreak(fullyCompletedDates, [0, 1, 2, 3, 4, 5, 6]);
  }

  private computeStreak(completedDates: IsoDate[], scheduleDays: WeekDay[]): StreakInfo {
    if (completedDates.length === 0) return { current: 0, longest: 0 };
    const sorted = Array.from(new Set(completedDates)).sort();
    const scheduledSet = new Set(scheduleDays);

    let longest = 0;
    let current = 0;
    let previous: dayjs.Dayjs | null = null;

    for (const dateStr of sorted) {
      const date = dayjs(dateStr);
      if (previous) {
        let cursor: dayjs.Dayjs = previous.add(1, 'day');
        let contiguous = true;
        while (cursor.isBefore(date)) {
          if (scheduledSet.has(cursor.day() as WeekDay)) {
            contiguous = false;
            break;
          }
          cursor = cursor.add(1, 'day');
        }
        current = contiguous ? current + 1 : 1;
      } else {
        current = 1;
      }
      longest = Math.max(longest, current);
      previous = date;
    }

    const today = dayjs();
    const last = previous!;
    let trailingCursor: dayjs.Dayjs = last.add(1, 'day');
    let brokenSinceLast = false;
    while (trailingCursor.isBefore(today, 'day')) {
      if (scheduledSet.has(trailingCursor.day() as WeekDay)) {
        brokenSinceLast = true;
        break;
      }
      trailingCursor = trailingCursor.add(1, 'day');
    }

    return { current: brokenSinceLast ? 0 : current, longest };
  }

  async heatmap(start: IsoDate, end: IsoDate): Promise<HeatmapDay[]> {
    const habits = await this.habitRepository.getActive();
    const habitHistory = await this.habitHistoryRepository.getForRange(start, end);
    const prayerHistory = await this.prayerHistoryRepository.getForRange(start, end);
    const days = isoRange(dayjs(start), dayjs(end));

    return days.map((date) => {
      const weekday = dayjs(date).day() as WeekDay;
      const scheduledHabits = habits.filter((h) => h.schedule.includes(weekday));
      const completedHabits = scheduledHabits.filter(
        (h) => habitHistory.find((entry) => entry.habitId === h.id && entry.date === date)?.completed,
      ).length;
      const completedPrayers = prayerHistory.filter((p) => p.date === date && p.completed).length;
      const totalScheduled = scheduledHabits.length + PRAYER_NAMES.length;
      const totalCompleted = completedHabits + completedPrayers;
      return { date, rate: totalScheduled === 0 ? 0 : Math.round((totalCompleted / totalScheduled) * 100) };
    });
  }

  async quranPagesRead(): Promise<number> {
    const progress = await this.quranRepository.getProgress();
    return progress.completions * QURAN_TOTAL_PAGES + (progress.currentPage - 1);
  }
}
