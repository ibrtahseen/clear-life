import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective, provideCharts } from 'ng2-charts';
import { BarController, BarElement, CategoryScale, LinearScale, Tooltip, type ChartConfiguration } from 'chart.js';
import dayjs from 'dayjs';

import { Statistics as StatisticsService } from '../../../core/services/statistics';
import { SettingsStore } from '../../../core/services/settings-store';
import { Quran as QuranService } from '../../../core/services/quran';
import { toIsoDate, formatDuration } from '../../../core/utils/date.util';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899'];

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
  private readonly settingsStore = inject(SettingsStore);
  private readonly quranService = inject(QuranService);
  private readonly translate = inject(TranslateService);

  private readonly today = new Date();
  private readonly year = this.today.getFullYear();
  private readonly month = this.today.getMonth() + 1;

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

  private readonly statsResource = resource({
    params: () => ({}),
    loader: async () => {
      const monthStart = toIsoDate(dayjs(new Date(this.year, this.month - 1, 1)));
      const monthEnd = toIsoDate(dayjs(new Date(this.year, this.month - 1, 1)).endOf('month'));
      const focusChartStart = toIsoDate(dayjs().subtract(13, 'day'));
      const focusChartEnd = toIsoDate(dayjs());

      const [quranPages, focusByDay, monthlyFocus] = await Promise.all([
        this.statisticsService.quranPagesRead(),
        this.statisticsService.focusSecondsByDay(focusChartStart, focusChartEnd),
        this.statisticsService.focusSecondsByDay(monthStart, monthEnd),
      ]);

      const monthlyFocusSeconds = monthlyFocus.reduce((sum, d) => sum + d.seconds, 0);

      return {
        quranPages,
        focusByDay,
        monthlyFocusSeconds,
      };
    },
  });
  readonly stats = this.statsResource.value;

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

  quranRangeLabel(): string {
    return this.quranService.currentRangeLabel();
  }
}
