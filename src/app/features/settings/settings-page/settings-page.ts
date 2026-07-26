import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, required } from '@angular/forms/signals';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { InlineMessage } from '../../../shared/components/inline-message/inline-message';
import { Confirm } from '../../../shared/services/confirm';

import { SettingsStore } from '../../../core/services/settings-store';
import { UserStore } from '../../../core/services/user-store';
import { I18n } from '../../../core/services/i18n';
import { Geolocation, CityEntry } from '../../../core/services/geolocation';
import { Backup, BackupValidationError } from '../../../core/services/backup';
import { Notification } from '../../../core/services/notification';
import { Language, ThemeMode, WeekDay } from '../../../core/models/common.model';

interface StepOption<T> {
  label: string;
  value: T;
  icon?: string;
}

@Component({
  selector: 'app-settings-page',
  imports: [
    FormsModule,
    FormField,
    TranslatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonToggleModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatAutocompleteModule,
    MatIconModule,
    InlineMessage,
  ],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly settingsStore = inject(SettingsStore);
  private readonly userStore = inject(UserStore);
  private readonly i18n = inject(I18n);
  private readonly geolocation = inject(Geolocation);
  private readonly backup = inject(Backup);
  private readonly notification = inject(Notification);
  private readonly confirm = inject(Confirm);
  private readonly translate = inject(TranslateService);

  readonly settings = computed(() => this.settingsStore.settings());

  private readonly nameModel = signal({ name: '' });
  readonly nameForm = form(this.nameModel, (path) => {
    required(path.name, { message: 'settings.nameRequired' });
  });
  readonly nameDirty = signal(false);

  readonly quranPagesModel = signal(this.settings().quranPagePerPry);
  readonly quranPagesDirty = signal(false);
  readonly quranPageOptions = Array.from({ length: 20 }, (_, i) => i + 1);

  readonly languageOptions: StepOption<Language>[] = [
    { label: 'English', value: 'en' },
    { label: 'العربية', value: 'ar' },
  ];

  readonly themeOptions: StepOption<ThemeMode>[] = [
    { label: 'Light', value: 'light', icon: 'light_mode' },
    { label: 'Dark', value: 'dark', icon: 'dark_mode' },
    { label: 'System', value: 'system', icon: 'desktop_windows' },
  ];

  readonly weekDayOptions: StepOption<WeekDay>[] = [
    { label: 'Sunday', value: 0 },
    { label: 'Monday', value: 1 },
    { label: 'Saturday', value: 6 },
  ];

  readonly locationMode = signal<'gps' | 'manual'>(this.settings().location?.type ?? 'gps');
  readonly citySuggestions = signal<CityEntry[]>([]);
  readonly selectedCity = signal<CityEntry | null>(
    this.settings().location?.type === 'manual'
      ? {
          city: this.settings().location!.city ?? '',
          country: this.settings().location!.country ?? '',
          lat: this.settings().location!.latitude,
          lng: this.settings().location!.longitude,
          timezone: this.settings().location!.timezone ?? '',
        }
      : null,
  );
  readonly locatingGps = signal(false);
  readonly gpsError = signal<string | null>(null);
  readonly gpsStatus = signal<'idle' | 'success'>(this.settings().location?.type === 'gps' ? 'success' : 'idle');

  readonly notificationPermission = this.notification.permission;
  readonly exporting = signal(false);
  readonly importing = signal(false);
  readonly importMessage = signal<{ kind: 'success' | 'error'; text: string } | null>(null);

  constructor() {
    const currentName = this.userStore.profile()?.name;
    if (currentName) {
      this.nameModel.set({ name: currentName });
    }
  }

  async saveName(): Promise<void> {
    if (!this.nameForm.name().valid()) return;
    await this.userStore.setName(this.nameForm().value().name.trim());
    this.nameDirty.set(false);
  }

  async setTheme(theme: ThemeMode): Promise<void> {
    await this.settingsStore.update({ theme });
  }

  async setLanguage(language: Language): Promise<void> {
    await this.i18n.setLanguage(language);
  }

  async setFirstDayOfWeek(day: WeekDay): Promise<void> {
    await this.settingsStore.update({ firstDayOfWeek: day });
  }

  onQuranPagesInput(pages: number): void {
    this.quranPagesModel.set(pages);
    this.quranPagesDirty.set(true);
  }

  async saveQuranPages(): Promise<void> {
    await this.settingsStore.update({ quranPagePerPry: this.quranPagesModel() });
    this.quranPagesDirty.set(false);
  }

  async togglePrayerReminders(enabled: boolean): Promise<void> {
    await this.settingsStore.update({
      notifications: { ...this.settings().notifications, prayerRemindersEnabled: enabled },
    });
  }

  async toggleHabitReminders(enabled: boolean): Promise<void> {
    await this.settingsStore.update({
      notifications: { ...this.settings().notifications, habitRemindersEnabled: enabled },
    });
  }

  async requestNotificationPermission(): Promise<void> {
    await this.notification.requestPermission();
  }

  async useGps(): Promise<void> {
    this.locationMode.set('gps');
    this.locatingGps.set(true);
    this.gpsError.set(null);
    try {
      const location = await this.geolocation.getCurrentPosition();
      await this.settingsStore.update({ location });
      this.gpsStatus.set('success');
    } catch {
      this.gpsError.set('gps-denied');
    } finally {
      this.locatingGps.set(false);
    }
  }

  useManualEntry(): void {
    this.locationMode.set('manual');
    this.gpsStatus.set('idle');
  }

  async searchCities(query: string): Promise<void> {
    this.citySuggestions.set(await this.geolocation.searchCities(query));
  }

  cityDisplayFn = (city: CityEntry | null): string => (city ? `${city.city}, ${city.country}` : '');

  async onCitySelected(event: MatAutocompleteSelectedEvent): Promise<void> {
    const city = event.option.value as CityEntry;
    this.selectedCity.set(city);
    await this.settingsStore.update({ location: this.geolocation.toManualLocation(city) });
  }

  async exportData(): Promise<void> {
    this.exporting.set(true);
    try {
      await this.backup.exportToFile();
    } finally {
      this.exporting.set(false);
    }
  }

  async onImportFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.importMessage.set(null);
    try {
      const parsedBackup = await this.backup.parseFile(file);
      const confirmed = await this.confirm.ask({
        header: this.translate.instant('settings.importConfirmHeader'),
        message: this.translate.instant('settings.importConfirmMessage'),
        danger: true,
      });
      if (confirmed) {
        await this.applyImport(parsedBackup);
      }
    } catch (error) {
      const text =
        error instanceof BackupValidationError ? error.message : this.translate.instant('settings.importFailed');
      this.importMessage.set({ kind: 'error', text });
    }
  }

  private async applyImport(parsedBackup: Awaited<ReturnType<Backup['parseFile']>>): Promise<void> {
    this.importing.set(true);
    try {
      await this.backup.restore(parsedBackup);
      window.location.reload();
    } catch {
      this.importMessage.set({ kind: 'error', text: this.translate.instant('settings.importFailed') });
      this.importing.set(false);
    }
  }
}
