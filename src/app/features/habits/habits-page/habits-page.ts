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
import { Clock } from '../../../core/services/clock';
import { isoRange, startOfWeek, toIsoDate } from '../../../core/utils/date.util';
import { Confirm } from '../../../shared/services/confirm';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { HabitFormDialog, HabitFormDialogData } from '../habit-form-dialog/habit-form-dialog';
import { ArchivedHabitsDialog } from '../archived-habits-dialog/archived-habits-dialog';

type ViewMode = 'all' | 'day';

/** Horizontal drag distance (px) past which a card release triggers archive. */
const SWIPE_ARCHIVE_THRESHOLD = 90;

@Component({
  selector: 'app-habits-page',
  imports: [TranslatePipe, MatButtonModule, MatIconModule, MatBadgeModule, DragDropModule, EmptyState],
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
  private readonly clock = inject(Clock);

  readonly habits = computed(() => this.habitService.activeHabits());
  readonly archivedCount = computed(() => this.habitService.archivedHabits().length);

  readonly todayIsoDate = computed(() => toIsoDate(new Date(this.clock.now())));
  readonly viewMode = signal<ViewMode>('day');
  readonly selectedDate = signal<IsoDate>(this.todayIsoDate());
  private readonly selectedHistory = signal<HabitHistoryEntry[]>([]);

  /** When on, the day list becomes drag-reorderable instead of swipe-to-archive. */
  readonly reorderMode = signal(false);

  private readonly swipingHabitId = signal<number | null>(null);
  private readonly swipeDeltaX = signal(0);
  private swipePointerId: number | null = null;
  private swipeStartX = 0;

  readonly weekDates = computed<IsoDate[]>(() => {
    const firstDayOfWeek = this.settingsStore.settings().firstDayOfWeek;
    const start = startOfWeek(new Date(), firstDayOfWeek);
    return isoRange(start, start.add(6, 'day'));
  });

  readonly selectedWeekday = computed(() => dayjs(this.selectedDate()).day() as WeekDay);
  readonly isSelectedToday = computed(() => this.selectedDate() === this.todayIsoDate());

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
    this.reorderMode.set(false);
    void this.loadHistory(date);
  }

  selectAll(): void {
    this.viewMode.set('all');
    this.reorderMode.set(false);
  }

  toggleReorderMode(): void {
    this.reorderMode.update((on) => !on);
  }

  weekdayLabel(date: IsoDate): string {
    return this.translate.instant(`habits.weekdayShort.${dayjs(date).day()}`);
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
      // Editing opens straight into a filled-out form — autofocusing the title
      // input would pop the mobile keyboard immediately for no reason. Creating
      // still focuses it since typing the title is the first thing to do.
      autoFocus: habit ? 'dialog' : true,
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

  /**
   * Reordering happens on the day-filtered subset (`displayedHabits`), but persisted order
   * spans every habit — so the subset's new relative order is spliced back into the full
   * list at the positions its members already occupied, leaving other habits untouched.
   */
  onDrop(event: CdkDragDrop<HabitModel[]>): void {
    if (!this.reorderMode() || event.previousIndex === event.currentIndex) return;
    const subset = this.displayedHabits();
    const reorderedSubset = [...subset];
    moveItemInArray(reorderedSubset, event.previousIndex, event.currentIndex);

    const subsetIds = new Set(subset.map((h) => h.id));
    let cursor = 0;
    const merged = this.habits().map((h) => (subsetIds.has(h.id) ? reorderedSubset[cursor++] : h));

    const ids = merged.map((h) => h.id).filter((id): id is number => id != null);
    void this.habitService.reorder(ids);
  }

  private resetSwipe(): void {
    this.swipingHabitId.set(null);
    this.swipeDeltaX.set(0);
    this.swipePointerId = null;
  }

  onSwipeStart(event: PointerEvent, habit: HabitModel): void {
    if (this.reorderMode() || habit.id == null) return;
    this.swipeStartX = event.clientX;
    this.swipePointerId = event.pointerId;
    this.swipingHabitId.set(habit.id);
    this.swipeDeltaX.set(0);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onSwipeMove(event: PointerEvent, habit: HabitModel): void {
    if (this.swipingHabitId() !== habit.id || this.swipePointerId !== event.pointerId) return;
    this.swipeDeltaX.set(event.clientX - this.swipeStartX);
  }

  async onSwipeEnd(event: PointerEvent, habit: HabitModel): Promise<void> {
    if (this.swipingHabitId() !== habit.id || this.swipePointerId !== event.pointerId) return;
    const delta = this.swipeDeltaX();
    this.resetSwipe();
    if (Math.abs(delta) > SWIPE_ARCHIVE_THRESHOLD) {
      await this.confirmArchive(habit);
    }
  }

  isSwiping(habit: HabitModel): boolean {
    return habit.id != null && this.swipingHabitId() === habit.id;
  }

  swipeTransform(habit: HabitModel): string {
    return this.isSwiping(habit) ? `translateX(${this.swipeDeltaX()}px)` : '';
  }

  swipeHintOpacity(habit: HabitModel): number {
    if (!this.isSwiping(habit)) return 0;
    return Math.min(1, Math.abs(this.swipeDeltaX()) / SWIPE_ARCHIVE_THRESHOLD);
  }

  swipeHintSide(habit: HabitModel): 'left' | 'right' {
    return this.isSwiping(habit) && this.swipeDeltaX() < 0 ? 'right' : 'left';
  }

  categoryLabel(habit: HabitModel): string {
    return this.categoryService.labelFor(habit);
  }

  openArchivedHabits(): void {
    this.dialog.open(ArchivedHabitsDialog, { width: '26rem', maxWidth: '92vw' });
  }
}
