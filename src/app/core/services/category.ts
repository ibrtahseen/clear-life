import { Service, inject, signal } from '@angular/core';
import { CategoryRepository } from '../data/repositories/category-repository';
import { Category as CategoryModel } from '../models/category.model';

@Service()
export class Category {
  private readonly categoryRepository = inject(CategoryRepository);

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
}
