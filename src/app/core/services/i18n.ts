import { Service, computed, effect, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { SettingsStore } from './settings-store';
import { Language } from '../models/common.model';

export const RTL_LANGUAGES: Language[] = ['ar'];

@Service()
export class I18n {
  private readonly translate = inject(TranslateService);
  private readonly settingsStore = inject(SettingsStore);

  readonly language = computed<Language>(() => this.settingsStore.settings().language);
  readonly isRtl = computed(() => RTL_LANGUAGES.includes(this.language()));

  constructor() {
    this.translate.addLangs(['en', 'ar']);

    effect(() => {
      const lang = this.language();
      const rtl = this.isRtl();
      this.translate.use(lang);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
        document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      }
    });
  }

  async setLanguage(lang: Language): Promise<void> {
    const directionChanged = this.isRtl() !== RTL_LANGUAGES.includes(lang);
    await this.settingsStore.update({ language: lang });
    if (directionChanged && typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  instant(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }
}
