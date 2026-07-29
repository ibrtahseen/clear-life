import { Service, inject, signal } from '@angular/core';
import { CategoryRepository } from '../data/repositories/category-repository';
import { Category as CategoryModel } from '../models/category.model';
import { Habit } from '../models/habit.model';
import { I18n } from './i18n';

@Service()
export class Category {
  private readonly categoryRepository = inject(CategoryRepository);
  private readonly i18n = inject(I18n);

  readonly categories = signal<CategoryModel[]>([]);

  async init(): Promise<void> {
    this.categories.set(await this.categoryRepository.getAll());
  }

  async create(input: { name: string; icon: string; color: string }): Promise<CategoryModel> {
    const created = await this.categoryRepository.create(input);
    this.categories.update((list) => [...list, created]);
    return created;
  }

  async delete(id: number): Promise<void> {
    await this.categoryRepository.delete(id);
    this.categories.update((list) => list.filter((c) => c.id !== id));
  }

  /** Display label for a habit's category — the custom category's name, or the translated preset label. */
  labelFor(habit: Habit): string {
    if (habit.category === 'custom' && habit.customCategoryId != null) {
      const custom = this.categories().find((c) => c.id === habit.customCategoryId);
      if (custom) return custom.name;
    }
    return this.i18n.instant(`habitCategories.${habit.category}`);
  }
}
