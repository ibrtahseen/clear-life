import { Service, inject } from '@angular/core';
import dayjs from 'dayjs';
import { Statistics } from './statistics';
import { toIsoDate } from '../utils/date.util';
import { Insight } from '../models/statistics.model';

const MIN_WEEKDAY_SAMPLE = 3;
const MIN_WEEKDAY_RATE = 60;
const MIN_FOCUS_SESSIONS = 3;
const MIN_TIME_OF_DAY_SAMPLE = 3;
const MIN_TIME_OF_DAY_GAP = 15;
const MIN_MONTH_DELTA = 2;
const MIN_BEST_HABIT_SAMPLE = 3;
const MIN_BEST_HABIT_RATE = 70;

/** Turns raw Statistics aggregates into a handful of narrative observations, e.g. "You complete 95% of your habits on Mondays." */
@Service()
export class Insights {
  private readonly statisticsService = inject(Statistics);

  async generate(): Promise<Insight[]> {
    const today = dayjs();
    const lookbackStart = toIsoDate(today.subtract(55, 'day'));
    const lookbackEnd = toIsoDate(today);
    const monthStart = toIsoDate(today.startOf('month'));
    const monthEnd = toIsoDate(today.endOf('month'));

    const [byWeekday, timeOfDay, focusBlocks, habitPerformance, monthDelta] = await Promise.all([
      this.statisticsService.habitCompletionByWeekday(lookbackStart, lookbackEnd),
      this.statisticsService.habitCompletionByTimeOfDay(lookbackStart, lookbackEnd),
      this.statisticsService.focusAverageDurationByBlock(lookbackStart, lookbackEnd),
      this.statisticsService.habitPerformance(monthStart, monthEnd),
      this.statisticsService.monthOverMonthDelta(today.toDate()),
    ]);

    return [
      this.bestWeekdayInsight(byWeekday),
      this.focusWindowInsight(focusBlocks),
      this.timeOfDayGapInsight(timeOfDay),
      this.monthComparisonInsight(monthDelta),
      this.bestHabitInsight(habitPerformance),
    ].filter((insight) => insight !== null);
  }

  private bestWeekdayInsight(
    byWeekday: Awaited<ReturnType<Statistics['habitCompletionByWeekday']>>,
  ): Insight | null {
    const candidates = byWeekday.filter((d) => d.summary.totalScheduled >= MIN_WEEKDAY_SAMPLE);
    if (candidates.length === 0) return null;
    const best = candidates.reduce((a, b) => (b.summary.rate > a.summary.rate ? b : a));
    if (best.summary.rate < MIN_WEEKDAY_RATE) return null;
    return { kind: 'bestWeekday', tone: 'positive', params: { day: best.day, rate: best.summary.rate } };
  }

  private focusWindowInsight(
    blocks: Awaited<ReturnType<Statistics['focusAverageDurationByBlock']>>,
  ): Insight | null {
    const totalSessions = blocks.reduce((sum, b) => sum + b.count, 0);
    if (totalSessions < MIN_FOCUS_SESSIONS) return null;
    const withData = blocks.filter((b) => b.count > 0);
    const best = withData.reduce((a, b) => (b.avgSeconds > a.avgSeconds ? b : a));
    if (best.avgSeconds <= 0) return null;
    return {
      kind: 'focusWindow',
      tone: 'neutral',
      params: { startHour: best.blockStartHour, endHour: (best.blockStartHour + 2) % 24 },
    };
  }

  private timeOfDayGapInsight(
    timeOfDay: Awaited<ReturnType<Statistics['habitCompletionByTimeOfDay']>>,
  ): Insight | null {
    const { morning, evening } = timeOfDay;
    if (morning.totalScheduled < MIN_TIME_OF_DAY_SAMPLE || evening.totalScheduled < MIN_TIME_OF_DAY_SAMPLE) return null;
    const gap = morning.rate - evening.rate;
    if (Math.abs(gap) < MIN_TIME_OF_DAY_GAP) return null;
    const worseSlot = gap > 0 ? 'evening' : 'morning';
    const betterSlot = gap > 0 ? 'morning' : 'evening';
    return { kind: 'timeOfDayGap', tone: 'negative', params: { worseSlot, betterSlot } };
  }

  private monthComparisonInsight(
    delta: Awaited<ReturnType<Statistics['monthOverMonthDelta']>>,
  ): Insight | null {
    if (!delta) return null;
    const diff = delta.currentRate - delta.previousRate;
    if (Math.abs(diff) < MIN_MONTH_DELTA) return null;
    return {
      kind: 'monthComparison',
      tone: diff > 0 ? 'positive' : 'negative',
      params: { percent: Math.abs(diff) },
    };
  }

  private bestHabitInsight(
    habitPerformance: Awaited<ReturnType<Statistics['habitPerformance']>>,
  ): Insight | null {
    const candidates = habitPerformance.filter((p) => p.summary.totalScheduled >= MIN_BEST_HABIT_SAMPLE);
    if (candidates.length === 0) return null;
    const best = candidates.reduce((a, b) => (b.summary.rate > a.summary.rate ? b : a));
    if (best.summary.rate < MIN_BEST_HABIT_RATE) return null;
    return { kind: 'bestHabit', tone: 'positive', params: { title: best.habit.title, rate: best.summary.rate } };
  }
}
