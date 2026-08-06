import { Service, computed, inject, signal } from '@angular/core';
import { HabitRepository } from '../data/repositories/habit-repository';
import { HabitHistoryRepository } from '../data/repositories/habit-history-repository';
import { Habit as HabitModel, HabitHistoryEntry } from '../models/habit.model';
import { IsoDate, WeekDay } from '../models/common.model';
import { todayIso } from '../utils/date.util';

@Service()
export class Habit {
  private readonly habitRepository = inject(HabitRepository);
  private readonly habitHistoryRepository = inject(HabitHistoryRepository);

  readonly habits = signal<HabitModel[]>([]);
  readonly todayHistory = signal<HabitHistoryEntry[]>([]);

  readonly activeHabits = computed(() =>
    this.habits()
      .filter((h) => !h.archived)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  );

  readonly archivedHabits = computed(() =>
    this.habits()
      .filter((h) => h.archived)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );

  readonly todaysHabits = computed(() => {
    const today = new Date().getDay() as WeekDay;
    return this.activeHabits().filter((h) => h.schedule.includes(today));
  });

  readonly completionMap = computed(() => {
    const map = new Map<number, boolean>();
    for (const entry of this.todayHistory()) {
      map.set(entry.habitId, entry.completed);
    }
    return map;
  });

  async init(): Promise<void> {
    await Promise.all([this.reloadHabits(), this.reloadToday()]);
  }

  async reloadHabits(): Promise<void> {
    this.habits.set(await this.habitRepository.getAll());
  }

  async reloadToday(): Promise<void> {
    this.todayHistory.set(await this.habitHistoryRepository.getForDate(todayIso()));
  }

  async create(
    habit: Omit<HabitModel, 'id' | 'createdAt' | 'updatedAt' | 'order'>,
  ): Promise<HabitModel> {
    const created = await this.habitRepository.create(habit);
    this.habits.update((list) => [...list, created]);
    return created;
  }

  async update(id: number, changes: Partial<HabitModel>): Promise<void> {
    await this.habitRepository.update(id, changes);
    await this.reloadHabits();
  }

  async archive(id: number): Promise<void> {
    await this.habitRepository.archive(id);
    await this.reloadHabits();
  }

  async restore(id: number): Promise<void> {
    await this.habitRepository.restore(id);
    await this.reloadHabits();
  }

  async delete(id: number): Promise<void> {
    await this.habitRepository.delete(id);
    await this.reloadHabits();
  }

  async toggleToday(habitId: number): Promise<void> {
    const wasCompleted = this.completionMap().get(habitId) ?? false;
    const entry = await this.habitHistoryRepository.setCompletion(
      habitId,
      todayIso(),
      !wasCompleted,
    );
    const updated = this.todayHistory().filter((e) => e.habitId !== habitId);
    updated.push(entry);
    this.todayHistory.set(updated);
  }

  async historyForDate(date: IsoDate): Promise<HabitHistoryEntry[]> {
    return this.habitHistoryRepository.getForDate(date);
  }

  async toggleForDate(habitId: number, date: IsoDate, wasCompleted: boolean): Promise<HabitHistoryEntry> {
    const entry = await this.habitHistoryRepository.setCompletion(habitId, date, !wasCompleted);
    if (date === todayIso()) {
      const updated = this.todayHistory().filter((e) => e.habitId !== habitId);
      updated.push(entry);
      this.todayHistory.set(updated);
    }
    return entry;
  }

  async reorder(habitIds: number[]): Promise<void> {
    const orderIndex = new Map(habitIds.map((id, index) => [id, index]));
    this.habits.update((list) =>
      list.map((h) =>
        h.id != null && orderIndex.has(h.id) ? { ...h, order: orderIndex.get(h.id)! } : h,
      ),
    );
    await this.habitRepository.reorder(habitIds);
  }
}
