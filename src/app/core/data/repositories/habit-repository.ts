import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database.service';
import { Habit } from '../../models/habit.model';

@Service()
export class HabitRepository {
  private readonly databaseService = inject(DatabaseService);
  private get table() {
    return this.databaseService.db.habits;
  }

  getAll(): Promise<Habit[]> {
    return this.table.toArray();
  }

  async getActive(): Promise<Habit[]> {
    const habits = await this.table.filter((h) => !h.archived).toArray();
    return habits.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  get(id: number): Promise<Habit | undefined> {
    return this.table.get(id);
  }

  async create(habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'order'>): Promise<Habit> {
    const now = new Date().toISOString();
    const maxOrder = await this.getMaxOrder();
    const toSave = { ...habit, order: maxOrder + 1, createdAt: now, updatedAt: now } as Habit;
    const id = await this.table.add(toSave);
    return { ...toSave, id };
  }

  async update(id: number, changes: Partial<Habit>): Promise<void> {
    await this.table.update(id, { ...changes, updatedAt: new Date().toISOString() });
  }

  async archive(id: number): Promise<void> {
    await this.update(id, { archived: true });
  }

  async restore(id: number): Promise<void> {
    await this.update(id, { archived: false });
  }

  async delete(id: number): Promise<void> {
    await this.table.delete(id);
  }

  async reorder(habitIds: number[]): Promise<void> {
    await this.databaseService.db.transaction('rw', this.table, async () => {
      await Promise.all(habitIds.map((id, index) => this.table.update(id, { order: index })));
    });
  }

  private async getMaxOrder(): Promise<number> {
    const all = await this.table.toArray();
    return all.reduce((max, h) => Math.max(max, h.order ?? 0), 0);
  }

  async bulkPut(habits: Habit[]): Promise<void> {
    await this.table.bulkPut(habits);
  }

  async clear(): Promise<void> {
    await this.table.clear();
  }
}
