import { Service, inject, signal } from '@angular/core';
import { SettingsRepository, buildDefaultSettings } from '../data/repositories/settings-repository';
import { AppSettings } from '../models/settings.model';

@Service()
export class SettingsStore {
  private readonly settingsRepository = inject(SettingsRepository);

  readonly settings = signal<AppSettings>(buildDefaultSettings());
  readonly ready = signal(false);

  async init(): Promise<void> {
    const settings = await this.settingsRepository.get();
    this.settings.set(settings);
    this.ready.set(true);
  }

  async update(partial: Partial<AppSettings>): Promise<void> {
    const saved = await this.settingsRepository.patch(partial);
    this.settings.set(saved);
  }

  async replaceAll(settings: AppSettings): Promise<void> {
    await this.settingsRepository.replace(settings);
    this.settings.set(settings);
  }
}
