import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Habit as HabitService } from '../../../core/services/habit';
import { Habit as HabitModel } from '../../../core/models/habit.model';
import { Confirm } from '../../../shared/services/confirm';

@Component({
  selector: 'app-archived-habits-dialog',
  imports: [TranslatePipe, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './archived-habits-dialog.html',
  styleUrl: './archived-habits-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivedHabitsDialog {
  private readonly habitService = inject(HabitService);
  private readonly confirm = inject(Confirm);
  private readonly translate = inject(TranslateService);

  readonly habits = this.habitService.archivedHabits;

  categoryLabel(category: HabitModel['category']): string {
    return this.translate.instant(`habitCategories.${category}`);
  }

  async restore(habit: HabitModel): Promise<void> {
    if (!habit.id) return;
    await this.habitService.restore(habit.id);
  }

  async deleteForever(habit: HabitModel): Promise<void> {
    if (!habit.id) return;
    const confirmed = await this.confirm.ask({
      header: this.translate.instant('habits.deleteConfirmHeader'),
      message: this.translate.instant('habits.deleteConfirmMessage', { title: habit.title }),
      confirmLabel: 'habits.deleteForever',
      danger: true,
    });
    if (confirmed) {
      await this.habitService.delete(habit.id);
    }
  }
}
