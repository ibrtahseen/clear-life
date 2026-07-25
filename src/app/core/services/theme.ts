import { Service, computed, effect, inject, signal } from '@angular/core';
import { SettingsStore } from './settings-store';
import { ThemeMode } from '../models/common.model';

export const DARK_MODE_SELECTOR = 'app-dark';

@Service()
export class Theme {
  private readonly settingsStore = inject(SettingsStore);
  private readonly systemPrefersDark = signal(this.matchesDarkPreference());

  readonly mode = computed<ThemeMode>(() => this.settingsStore.settings().theme);
  readonly isDark = computed(() => {
    const mode = this.mode();
    return mode === 'dark' || (mode === 'system' && this.systemPrefersDark());
  });

  constructor() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', (e) => this.systemPrefersDark.set(e.matches));
    }

    effect(() => {
      const dark = this.isDark();
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle(DARK_MODE_SELECTOR, dark);
        document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
      }
    });
  }

  private matchesDarkPreference(): boolean {
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
  }

  async setMode(mode: ThemeMode): Promise<void> {
    await this.settingsStore.update({ theme: mode });
  }
}
