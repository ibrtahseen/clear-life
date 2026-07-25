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

  /**
   * Switches the app language, reloading the page if text direction changes.
   * Angular Material's CDK `Directionality` service snapshots `dir` once at
   * bootstrap and doesn't react to it changing later, so components created
   * after a live LTR/RTL switch (e.g. dialogs, form fields) render with the
   * wrong internal layout unless the app re-bootstraps.
   */
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
