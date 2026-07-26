import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import dayjs from 'dayjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import { Habit as HabitService } from '../../../core/services/habit';
import { Category as CategoryService } from '../../../core/services/category';
import { Habit as HabitModel, HabitHistoryEntry } from '../../../core/models/habit.model';
import { IsoDate, WeekDay } from '../../../core/models/common.model';
import { SettingsStore } from '../../../core/services/settings-store';
import { isoRange, startOfWeek, todayIso } from '../../../core/utils/date.util';
import { Confirm } from '../../../shared/services/confirm';
import { HabitFormDialog, HabitFormDialogData } from '../habit-form-dialog/habit-form-dialog';
import { ArchivedHabitsDialog } from '../archived-habits-dialog/archived-habits-dialog';

const WEEKDAY_SHORT: Record<WeekDay, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

type ViewMode = 'all' | 'day';

@Component({
  selector: 'app-habits-page',
  imports: [TranslatePipe, MatButtonModule, MatIconModule, MatBadgeModule, DragDropModule],
  templateUrl: './habits-page.html',
  styleUrl: './habits-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HabitsPage {
  private readonly habitService = inject(HabitService);
  private readonly categoryService = inject(CategoryService);
  private readonly settingsStore = inject(SettingsStore);
  private readonly confirm = inject(Confirm);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  readonly habits = computed(() => this.habitService.activeHabits());
  readonly archivedCount = computed(() => this.habitService.archivedHabits().length);

  readonly todayIsoDate = todayIso();
  readonly viewMode = signal<ViewMode>('day');
  readonly selectedDate = signal<IsoDate>(this.todayIsoDate);
  private readonly selectedHistory = signal<HabitHistoryEntry[]>([]);

  readonly weekDates = computed<IsoDate[]>(() => {
    const firstDayOfWeek = this.settingsStore.settings().firstDayOfWeek;
    const start = startOfWeek(new Date(), firstDayOfWeek);
    return isoRange(start, start.add(6, 'day'));
  });

  readonly selectedWeekday = computed(() => dayjs(this.selectedDate()).day() as WeekDay);
  readonly isSelectedToday = computed(() => this.selectedDate() === this.todayIsoDate);

  private readonly selectedCompletionMap = computed(() => {
    const map = new Map<number, boolean>();
    for (const entry of this.selectedHistory()) {
      map.set(entry.habitId, entry.completed);
    }
    return map;
  });

  /**
   * Habits shown for the current view: the full active list in "all" mode, or
   * just the habits scheduled on the selected weekday — with completed ones
   * sorted to the end so it's obvious what's next.
   */
  readonly displayedHabits = computed(() => {
    if (this.viewMode() === 'all') {
      return this.habits();
    }
    const weekday = this.selectedWeekday();
    const map = this.selectedCompletionMap();
    return this.habits()
      .filter((h) => h.schedule.includes(weekday))
      .slice()
      .sort((a, b) => {
        const aDone = a.id != null && (map.get(a.id) ?? false);
        const bDone = b.id != null && (map.get(b.id) ?? false);
        return aDone === bDone ? 0 : aDone ? 1 : -1;
      });
  });

  constructor() {
    void this.habitService.init();
    void this.categoryService.init();
    void this.loadHistory(this.selectedDate());
  }

  private async loadHistory(date: IsoDate): Promise<void> {
    this.selectedHistory.set(await this.habitService.historyForDate(date));
  }

  selectDay(date: IsoDate): void {
    this.viewMode.set('day');
    this.selectedDate.set(date);
    void this.loadHistory(date);
  }

  selectAll(): void {
    this.viewMode.set('all');
  }

  weekdayLabel(date: IsoDate): string {
    return WEEKDAY_SHORT[dayjs(date).day() as WeekDay];
  }

  dayNumber(date: IsoDate): number {
    return dayjs(date).date();
  }

  isCompletedSelected(habit: HabitModel): boolean {
    return habit.id != null ? (this.selectedCompletionMap().get(habit.id) ?? false) : false;
  }

  /** Completion can only be toggled for today — past/future days are view-only. */
  async toggle(habit: HabitModel): Promise<void> {
    if (!habit.id || this.viewMode() !== 'day' || !this.isSelectedToday()) return;
    const wasCompleted = this.selectedCompletionMap().get(habit.id) ?? false;
    const entry = await this.habitService.toggleForDate(habit.id, this.selectedDate(), wasCompleted);
    const updated = this.selectedHistory().filter((e) => e.habitId !== habit.id);
    updated.push(entry);
    this.selectedHistory.set(updated);
  }

  openCreateDialog(): void {
    this.openDialog(null);
  }

  openEditDialog(habit: HabitModel): void {
    this.openDialog(habit);
  }

  private openDialog(habit: HabitModel | null): void {
    const ref = this.dialog.open<HabitFormDialog, HabitFormDialogData, boolean>(HabitFormDialog, {
      data: { habit },
      width: '28rem',
      maxWidth: '92vw',
    });
    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        void this.habitService.reloadHabits();
        void this.habitService.reloadToday();
        void this.loadHistory(this.selectedDate());
      }
    });
  }

  async confirmArchive(habit: HabitModel): Promise<void> {
    if (!habit.id) return;
    const confirmed = await this.confirm.ask({
      header: this.translate.instant('habits.archiveConfirmHeader'),
      message: this.translate.instant('habits.archiveConfirmMessage', { title: habit.title }),
      danger: true,
    });
    if (confirmed) {
      await this.habitService.archive(habit.id);
    }
  }

  /** Reordering only applies in "all" view, where the visible list matches the full stored order. */
  onDrop(event: CdkDragDrop<HabitModel[]>): void {
    if (this.viewMode() !== 'all' || event.previousIndex === event.currentIndex) return;
    const reordered = [...this.habits()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    const ids = reordered.map((h) => h.id).filter((id): id is number => id != null);
    void this.habitService.reorder(ids);
  }

  categoryLabel(habit: HabitModel): string {
    if (habit.category === 'custom' && habit.customCategoryId != null) {
      const custom = this.categoryService.categories().find((c) => c.id === habit.customCategoryId);
      if (custom) return custom.name;
    }
    return this.translate.instant(`habitCategories.${habit.category}`);
  }

  openArchivedHabits(): void {
    this.dialog.open(ArchivedHabitsDialog, { width: '26rem', maxWidth: '92vw' });
  }
}
