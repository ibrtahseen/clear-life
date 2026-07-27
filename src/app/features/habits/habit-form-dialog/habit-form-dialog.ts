import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, required } from '@angular/forms/signals';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

import { Habit as HabitService } from '../../../core/services/habit';
import { Category as CategoryService } from '../../../core/services/category';
import { Habit as HabitModel } from '../../../core/models/habit.model';
import { HabitCategory, WeekDay, HABIT_CATEGORIES } from '../../../core/models/common.model';
import { TimePicker } from '../../../shared/components/time-picker/time-picker';

export interface HabitFormDialogData {
  habit: HabitModel | null;
}

interface HabitFormValue {
  title: string;
}

type PresetCategory = Exclude<HabitCategory, 'custom'>;

/** Fixed icon + color per built-in category — not user-editable. */
const CATEGORY_PRESET_META: Record<PresetCategory, { icon: string; color: string }> = {
  health: { icon: 'favorite', color: '#ef4444' },
  reading: { icon: 'menu_book', color: '#6366f1' },
  exercise: { icon: 'fitness_center', color: '#22c55e' },
  study: { icon: 'school', color: '#06b6d4' },
  work: { icon: 'work', color: '#64748b' },
  personal: { icon: 'self_improvement', color: '#a855f7' },
  spirituality: { icon: 'spa', color: '#ec4899' },
  finance: { icon: 'savings', color: '#f59e0b' },
  family: { icon: 'family_restroom', color: '#84cc16' },
  social: { icon: 'groups', color: '#14b8a6' },
  creativity: { icon: 'palette', color: '#f97316' },
  sleep: { icon: 'bedtime', color: '#3b82f6' },
  nutrition: { icon: 'restaurant', color: '#10b981' },
  mindfulness: { icon: 'psychology', color: '#8b5cf6' },
};

type CategoryChoice =
  | { kind: 'preset'; key: PresetCategory; icon: string; color: string; label: string }
  | { kind: 'custom'; id: number; icon: string; color: string; label: string };

/** Icon/color swatches offered only when creating a new custom category. */
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
    MatIconModule,
    TimePicker,
  ],
  templateUrl: './habit-form-dialog.html',
  styleUrl: './habit-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HabitFormDialog {
  private readonly habitService = inject(HabitService);
  private readonly categoryService = inject(CategoryService);
  private readonly dialogRef = inject(MatDialogRef<HabitFormDialog, boolean>);
  private readonly data = inject<HabitFormDialogData>(MAT_DIALOG_DATA);
  private readonly translate = inject(TranslateService);

  readonly habitToEdit = this.data.habit;

  readonly icons = ICON_PRESETS;
  readonly colors = COLOR_PRESETS;
  readonly weekDays: { value: WeekDay; label: string }[] = ([0, 1, 2, 3, 4, 5, 6] as WeekDay[]).map((value) => ({
    value,
    label: this.translate.instant(`habits.weekdayLetters.${value}`),
  }));

  readonly presetChoices: CategoryChoice[] = HABIT_CATEGORIES.filter(
    (key): key is PresetCategory => key !== 'custom',
  ).map((key) => ({
    kind: 'preset',
    key,
    icon: CATEGORY_PRESET_META[key].icon,
    color: CATEGORY_PRESET_META[key].color,
    label: this.translate.instant(`habitCategories.${key}`),
  }));

  readonly categoryChoices = computed<CategoryChoice[]>(() => [
    ...this.presetChoices,
    ...this.categoryService.categories().map((c) => ({
      kind: 'custom' as const,
      id: c.id!,
      icon: c.icon,
      color: c.color,
      label: c.name,
    })),
  ]);

  readonly selectedChoice = signal<CategoryChoice>(this.presetChoices[5]); // 'personal' fallback
  readonly selectedSchedule = signal<WeekDay[]>(this.habitToEdit?.schedule ?? [0, 1, 2, 3, 4, 5, 6]);
  readonly saving = signal(false);

  readonly creatingCategory = signal(false);
  readonly newCategoryName = signal('');
  readonly newCategoryIcon = signal(ICON_PRESETS[0]);
  readonly newCategoryColor = signal(COLOR_PRESETS[0]);

  readonly reminderTime = signal<string | null>(this.habitToEdit?.reminderTime ?? null);

  private readonly model_ = signal<HabitFormValue>({
    title: this.habitToEdit?.title ?? '',
  });
  readonly habitForm = form(this.model_, (path) => {
    required(path.title, { message: 'habits.titleRequired' });
  });

  constructor() {
    this.selectedChoice.set(this.resolveInitialChoice());
  }

  private resolveInitialChoice(): CategoryChoice {
    const habit = this.habitToEdit;
    if (!habit) return this.presetChoices.find((c) => c.kind === 'preset' && c.key === 'personal')!;
    if (habit.category !== 'custom') {
      return this.presetChoices.find((c) => c.kind === 'preset' && c.key === habit.category) ?? this.presetChoices[0];
    }
    const custom = this.categoryService.categories().find((c) => c.id === habit.customCategoryId);
    if (custom) {
      return { kind: 'custom', id: custom.id!, icon: custom.icon, color: custom.color, label: custom.name };
    }
    return this.presetChoices[0];
  }

  selectChoice(choice: CategoryChoice): void {
    this.selectedChoice.set(choice);
  }

  isChoiceSelected(choice: CategoryChoice): boolean {
    const current = this.selectedChoice();
    if (current.kind === 'preset' && choice.kind === 'preset') return current.key === choice.key;
    if (current.kind === 'custom' && choice.kind === 'custom') return current.id === choice.id;
    return false;
  }

  startNewCategory(): void {
    this.creatingCategory.set(true);
    this.newCategoryName.set('');
    this.newCategoryIcon.set(ICON_PRESETS[0]);
    this.newCategoryColor.set(COLOR_PRESETS[0]);
  }

  cancelNewCategory(): void {
    this.creatingCategory.set(false);
  }

  async saveNewCategory(): Promise<void> {
    const name = this.newCategoryName().trim();
    if (!name) return;
    const created = await this.categoryService.create({
      name,
      icon: this.newCategoryIcon(),
      color: this.newCategoryColor(),
    });
    this.selectedChoice.set({ kind: 'custom', id: created.id!, icon: created.icon, color: created.color, label: created.name });
    this.creatingCategory.set(false);
  }

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
      const choice = this.selectedChoice();
      const payload = {
        title: values.title.trim(),
        icon: choice.icon,
        color: choice.color,
        category: choice.kind === 'preset' ? choice.key : ('custom' as const),
        customCategoryId: choice.kind === 'custom' ? choice.id : null,
        schedule: this.selectedSchedule(),
        reminderTime: this.reminderTime(),
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
