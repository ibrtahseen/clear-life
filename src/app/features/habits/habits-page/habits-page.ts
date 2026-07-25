import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import { Habit as HabitService } from '../../../core/services/habit';
import { Habit as HabitModel } from '../../../core/models/habit.model';
import { WeekDay } from '../../../core/models/common.model';
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

@Component({
  selector: 'app-habits-page',
  imports: [TranslatePipe, MatButtonModule, MatIconModule, MatBadgeModule, DragDropModule],
  templateUrl: './habits-page.html',
  styleUrl: './habits-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HabitsPage {
  private readonly habitService = inject(HabitService);
  private readonly confirm = inject(Confirm);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  readonly habits = computed(() => this.habitService.activeHabits());
  readonly archivedCount = computed(() => this.habitService.archivedHabits().length);
  readonly completionMap = this.habitService.completionMap;
  readonly todayWeekday = new Date().getDay() as WeekDay;

  constructor() {
    void this.habitService.init();
  }

  weekdayLabel(day: WeekDay): string {
    return WEEKDAY_SHORT[day];
  }

  isScheduledToday(habit: HabitModel): boolean {
    return habit.schedule.includes(this.todayWeekday);
  }

  isCompletedToday(habit: HabitModel): boolean {
    return habit.id ? (this.completionMap().get(habit.id) ?? false) : false;
  }

  async toggle(habit: HabitModel): Promise<void> {
    if (!habit.id || !this.isScheduledToday(habit)) return;
    await this.habitService.toggleToday(habit.id);
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

  onDrop(event: CdkDragDrop<HabitModel[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const reordered = [...this.habits()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    const ids = reordered.map((h) => h.id).filter((id): id is number => id != null);
    void this.habitService.reorder(ids);
  }

  categoryLabel(category: HabitModel['category']): string {
    return this.translate.instant(`habitCategories.${category}`);
  }

  openArchivedHabits(): void {
    this.dialog.open(ArchivedHabitsDialog, { width: '26rem', maxWidth: '92vw' });
  }
}
