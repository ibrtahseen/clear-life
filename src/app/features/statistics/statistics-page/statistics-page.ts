import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import type { ChartConfiguration } from 'chart.js';
import dayjs from 'dayjs';

import { SettingsStore } from '../../../core/services/settings-store';
import { Statistics as StatisticsService } from '../../../core/services/statistics';
import { HabitRepository } from '../../../core/data/repositories/habit-repository';
import { toIsoDate } from '../../../core/utils/date.util';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899'];

@Component({
  selector: 'app-statistics-page',
  imports: [TranslatePipe, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './statistics-page.html',
  styleUrl: './statistics-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsPage {
  private readonly settingsStore = inject(SettingsStore);
  private readonly statisticsService = inject(StatisticsService);
  private readonly habitRepository = inject(HabitRepository);
  private readonly translate = inject(TranslateService);

  private readonly today = new Date();
  private readonly year = this.today.getFullYear();
  private readonly month = this.today.getMonth() + 1;

  private readonly statsResource = resource({
    params: () => ({ firstDayOfWeek: this.settingsStore.settings().firstDayOfWeek }),
    loader: async ({ params }) => {
      const monthStart = toIsoDate(dayjs(new Date(this.year, this.month - 1, 1)));
      const monthEnd = toIsoDate(dayjs(new Date(this.year, this.month - 1, 1)).endOf('month'));
      const heatmapStart = toIsoDate(dayjs().subtract(34, 'day'));
      const heatmapEnd = toIsoDate(dayjs());

      const [weekly, monthly, category, heatmap, prayerStreak, quranPages, habits] = await Promise.all([
        this.statisticsService.weeklyCompletion(this.today, params.firstDayOfWeek),
        this.statisticsService.monthlyCompletion(this.year, this.month),
        this.statisticsService.categoryBreakdown(monthStart, monthEnd),
        this.statisticsService.heatmap(heatmapStart, heatmapEnd),
        this.statisticsService.prayerStreak(),
        this.statisticsService.quranPagesRead(),
        this.habitRepository.getActive(),
      ]);

      const habitStreaks = await Promise.all(habits.map((h) => this.statisticsService.habitStreak(h)));
      const bestCurrent = habitStreaks.reduce((max, s) => Math.max(max, s.current), 0);
      const bestLongest = habitStreaks.reduce((max, s) => Math.max(max, s.longest), 0);

      return { weekly, monthly, category, heatmap, prayerStreak, quranPages, bestCurrent, bestLongest };
    },
  });
  readonly stats = this.statsResource.value;

  readonly weeklyChartData = computed<ChartConfiguration<'bar'>['data'] | null>(() => {
    const data = this.stats();
    if (!data) return null;
    return {
      labels: [this.translate.instant('habits.title'), this.translate.instant('prayers.title')],
      datasets: [
        {
          label: this.translate.instant('dashboard.weeklyCompletion'),
          data: [data.weekly.habit.rate, data.weekly.prayer.rate],
          backgroundColor: [CHART_COLORS[0], CHART_COLORS[1]],
          borderRadius: 8,
        },
      ],
    };
  });

  readonly monthlyChartData = computed<ChartConfiguration<'bar'>['data'] | null>(() => {
    const data = this.stats();
    if (!data) return null;
    return {
      labels: [this.translate.instant('habits.title'), this.translate.instant('prayers.title')],
      datasets: [
        {
          label: this.translate.instant('statistics.monthlyCompletion'),
          data: [data.monthly.habit.rate, data.monthly.prayer.rate],
          backgroundColor: [CHART_COLORS[2], CHART_COLORS[3]],
          borderRadius: 8,
        },
      ],
    };
  });

  readonly categoryChartData = computed<ChartConfiguration<'doughnut'>['data'] | null>(() => {
    const data = this.stats();
    if (!data || data.category.length === 0) return null;
    return {
      labels: data.category.map((c) => this.translate.instant(`habitCategories.${c.category}`)),
      datasets: [
        {
          data: data.category.map((c) => c.summary.rate),
          backgroundColor: data.category.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        },
      ],
    };
  });

  readonly chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, max: 100 } },
  };

  readonly doughnutOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  heatmapCellClass(rate: number): string {
    if (rate === 0) return 'heat-0';
    if (rate < 40) return 'heat-1';
    if (rate < 70) return 'heat-2';
    if (rate < 100) return 'heat-3';
    return 'heat-4';
  }
}
