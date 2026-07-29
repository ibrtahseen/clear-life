import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective, provideCharts } from 'ng2-charts';
import { BarController, BarElement, CategoryScale, LinearScale, Tooltip, type ChartConfiguration } from 'chart.js';
import dayjs from 'dayjs';

import { Statistics as StatisticsService } from '../../../core/services/statistics';
import { Insights as InsightsService } from '../../../core/services/insights';
import { Insight, InsightTone } from '../../../core/models/statistics.model';
import { toIsoDate, formatDuration, formatTime } from '../../../core/utils/date.util';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899'];

interface InsightViewModel {
  icon: string;
  tone: InsightTone;
  text: string;
}

@Component({
  selector: 'app-statistics-page',
  imports: [TranslatePipe, MatIconModule, BaseChartDirective, EmptyState],
  // Only 'bar' charts are used here — registering the full default set (radar,
  // bubble, scatter, time scales, etc.) via withDefaultRegisterables() pulled a
  // large chunk of unused chart.js into this page's bundle.
  providers: [
    provideCharts({
      registerables: [BarController, CategoryScale, LinearScale, BarElement, Tooltip],
    }),
  ],
  templateUrl: './statistics-page.html',
  styleUrl: './statistics-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsPage {
  private readonly statisticsService = inject(StatisticsService);
  private readonly insightsService = inject(InsightsService);
  private readonly translate = inject(TranslateService);

  private readonly today = new Date();
  private readonly year = this.today.getFullYear();
  private readonly month = this.today.getMonth() + 1;

  private readonly statsResource = resource({
    params: () => ({}),
    loader: async () => {
      const monthStart = toIsoDate(dayjs(new Date(this.year, this.month - 1, 1)));
      const monthEnd = toIsoDate(dayjs(new Date(this.year, this.month - 1, 1)).endOf('month'));
      const focusChartStart = toIsoDate(dayjs().subtract(13, 'day'));
      const focusChartEnd = toIsoDate(dayjs());

      const [quranPages, habitPerformance, focusByDay, monthlyFocus, insights] = await Promise.all([
        this.statisticsService.quranPagesRead(),
        this.statisticsService.habitPerformance(monthStart, monthEnd),
        this.statisticsService.focusSecondsByDay(focusChartStart, focusChartEnd),
        this.statisticsService.focusSecondsByDay(monthStart, monthEnd),
        this.insightsService.generate(),
      ]);

      const monthlyFocusSeconds = monthlyFocus.reduce((sum, d) => sum + d.seconds, 0);

      return {
        quranPages,
        habitPerformance: habitPerformance.sort((a, b) => b.summary.rate - a.summary.rate),
        focusByDay,
        monthlyFocusSeconds,
        insights,
      };
    },
  });
  readonly stats = this.statsResource.value;

  readonly insightViewModels = computed<InsightViewModel[]>(() => {
    const data = this.stats();
    if (!data) return [];
    return data.insights.map((insight) => this.toInsightViewModel(insight));
  });

  private toInsightViewModel(insight: Insight): InsightViewModel {
    switch (insight.kind) {
      case 'bestWeekday':
        return {
          icon: 'calendar_month',
          tone: insight.tone,
          text: this.translate.instant('statistics.insightBestWeekday', {
            rate: insight.params['rate'],
            day: this.translate.instant(`statistics.weekdayFull.${insight.params['day']}`),
          }),
        };
      case 'focusWindow':
        return {
          icon: 'bolt',
          tone: insight.tone,
          text: this.translate.instant('statistics.insightFocusWindow', {
            start: formatTime(`${insight.params['startHour']}:00`),
            end: formatTime(`${insight.params['endHour']}:00`),
          }),
        };
      case 'timeOfDayGap':
        return {
          icon: 'schedule',
          tone: insight.tone,
          text: this.translate.instant('statistics.insightTimeOfDayGap', {
            worse: this.translate.instant(`statistics.timeSlot.${insight.params['worseSlot']}`),
            better: this.translate.instant(`statistics.timeSlot.${insight.params['betterSlot']}`),
          }),
        };
      case 'monthComparison':
        return {
          icon: insight.tone === 'positive' ? 'trending_up' : 'trending_down',
          tone: insight.tone,
          text: this.translate.instant(
            insight.tone === 'positive' ? 'statistics.insightMonthImproved' : 'statistics.insightMonthDeclined',
            { percent: insight.params['percent'] },
          ),
        };
      case 'bestHabit':
        return {
          icon: 'military_tech',
          tone: insight.tone,
          text: this.translate.instant('statistics.insightBestHabit', {
            title: insight.params['title'],
            rate: insight.params['rate'],
          }),
        };
    }
  }

  readonly habitPerformanceChartData = computed<ChartConfiguration<'bar'>['data'] | null>(() => {
    const data = this.stats();
    if (!data || data.habitPerformance.length === 0) return null;
    return {
      labels: data.habitPerformance.map((p) => p.habit.title),
      datasets: [
        {
          label: this.translate.instant('statistics.habitPerformance'),
          data: data.habitPerformance.map((p) => p.summary.rate),
          backgroundColor: data.habitPerformance.map((p) => p.habit.color || CHART_COLORS[0]),
          borderRadius: 6,
        },
      ],
    };
  });

  readonly focusChartData = computed<ChartConfiguration<'bar'>['data'] | null>(() => {
    const data = this.stats();
    if (!data) return null;
    return {
      labels: data.focusByDay.map((d) => dayjs(d.date).format('MMM D')),
      datasets: [
        {
          label: this.translate.instant('statistics.focusTimeTrend'),
          data: data.focusByDay.map((d) => Math.round(d.seconds / 60)),
          backgroundColor: CHART_COLORS[4],
          borderRadius: 6,
        },
      ],
    };
  });

  readonly monthlyFocusLabel = computed(() => {
    const data = this.stats();
    return data ? formatDuration(data.monthlyFocusSeconds) : '';
  });

  readonly habitPerformanceOptions: ChartConfiguration['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, max: 100 } },
  };

  readonly focusChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => formatDuration(Number(ctx.raw) * 60),
        },
      },
    },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 30 } } },
  };
}
