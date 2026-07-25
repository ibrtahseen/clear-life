import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, required } from '@angular/forms/signals';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

import { Habit as HabitService } from '../../../core/services/habit';
import { Habit as HabitModel } from '../../../core/models/habit.model';
import { HabitCategory, WeekDay, HABIT_CATEGORIES } from '../../../core/models/common.model';

export interface HabitFormDialogData {
  habit: HabitModel | null;
}

interface HabitFormValue {
  title: string;
  reminderTime: string;
}

const ICON_PRESETS = [
  'menu_book',
  'mosque',
  'favorite',
  'bolt',
  'star',
  'work',
  'edit',
  'nights_stay',
  'light_mode',
  'school',
  'attach_money',
  'savings',
  'home',
  'smartphone',
  'fitness_center',
  'directions_run',
  'self_improvement',
  'spa',
  'psychology',
  'restaurant',
  'local_drink',
  'bedtime',
  'family_restroom',
  'groups',
  'palette',
  'music_note',
  'eco',
  'checklist',
];

const COLOR_PRESETS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899', '#84cc16'];

const WEEKDAY_LABELS: Record<WeekDay, string> = {
  0: 'S',
  1: 'M',
  2: 'T',
  3: 'W',
  4: 'T',
  5: 'F',
  6: 'S',
};

@Component({
  selector: 'app-habit-form-dialog',
  imports: [
    FormsModule,
    FormField,
    TranslatePipe,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
  ],
  templateUrl: './habit-form-dialog.html',
  styleUrl: './habit-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HabitFormDialog {
  private readonly habitService = inject(HabitService);
  private readonly dialogRef = inject(MatDialogRef<HabitFormDialog, boolean>);
  private readonly data = inject<HabitFormDialogData>(MAT_DIALOG_DATA);
  private readonly translate = inject(TranslateService);

  readonly habitToEdit = this.data.habit;

  readonly icons = ICON_PRESETS;
  readonly colors = COLOR_PRESETS;
  readonly weekDays: { value: WeekDay; label: string }[] = (
    Object.keys(WEEKDAY_LABELS) as unknown as WeekDay[]
  ).map((value) => ({ value: Number(value) as WeekDay, label: WEEKDAY_LABELS[Number(value) as WeekDay] }));

  readonly categoryOptions: { label: string; value: HabitCategory }[] = HABIT_CATEGORIES.map((category) => ({
    label: this.translate.instant(`habitCategories.${category}`),
    value: category,
  }));

  readonly selectedIcon = signal(this.habitToEdit?.icon ?? ICON_PRESETS[0]);
  readonly selectedColor = signal(this.habitToEdit?.color ?? COLOR_PRESETS[0]);
  readonly selectedCategory = signal<HabitCategory>(this.habitToEdit?.category ?? 'personal');
  readonly selectedSchedule = signal<WeekDay[]>(this.habitToEdit?.schedule ?? [0, 1, 2, 3, 4, 5, 6]);
  readonly saving = signal(false);

  private readonly model_ = signal<HabitFormValue>({
    title: this.habitToEdit?.title ?? '',
    reminderTime: this.habitToEdit?.reminderTime ?? '',
  });
  readonly habitForm = form(this.model_, (path) => {
    required(path.title, { message: 'habits.titleRequired' });
  });

  toggleDay(day: WeekDay): void {
    const current = this.selectedSchedule();
    this.selectedSchedule.set(
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    );
  }

  isDaySelected(day: WeekDay): boolean {
    return this.selectedSchedule().includes(day);
  }

  async save(): Promise<void> {
    if (!this.habitForm().valid() || this.selectedSchedule().length === 0) return;
    this.saving.set(true);
    try {
      const values = this.habitForm().value();
      const payload = {
        title: values.title.trim(),
        icon: this.selectedIcon(),
        color: this.selectedColor(),
        category: this.selectedCategory(),
        schedule: this.selectedSchedule(),
        reminderTime: values.reminderTime || null,
        archived: false,
      };

      if (this.habitToEdit?.id) {
        await this.habitService.update(this.habitToEdit.id, payload);
      } else {
        await this.habitService.create(payload);
      }

      this.dialogRef.close(true);
    } finally {
      this.saving.set(false);
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
