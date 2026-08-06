import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database.service';
import { Category } from '../../models/category.model';

@Service()
export class CategoryRepository {
  private readonly databaseService = inject(DatabaseService);
  private get table() {
    return this.databaseService.db.categories;
  }

  getAll(): Promise<Category[]> {
    return this.table.toArray();
  }

  async create(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const now = new Date().toISOString();
    const toSave = { ...category, createdAt: now, updatedAt: now };
    const id = await this.table.add(toSave);
    return { ...toSave, id };
  }

  async delete(id: number): Promise<void> {
    await this.table.delete(id);
  }
}
