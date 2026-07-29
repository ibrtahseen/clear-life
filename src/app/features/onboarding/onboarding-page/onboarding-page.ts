import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField, required, schema, submit } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { InlineMessage } from '../../../shared/components/inline-message/inline-message';

import { UserStore } from '../../../core/services/user-store';
import { SettingsStore } from '../../../core/services/settings-store';
import { Geolocation, CityEntry } from '../../../core/services/geolocation';
import { AppStateRepository } from '../../../core/data/repositories/app-state-repository';
import {
  Language,
  LANGUAGE_OPTIONS,
  THEME_OPTIONS,
  ThemeMode,
  WeekDay,
  WEEK_DAY_OPTIONS,
} from '../../../core/models/common.model';

interface OnboardingFormValue {
  name: string;
  language: Language;
  theme: ThemeMode;
  firstDayOfWeek: WeekDay;
}

const onboardingSchema = schema<OnboardingFormValue>((path) => {
  required(path.name, { message: 'onboarding.nameRequired' });
});

@Component({
  selector: 'app-onboarding-page',
  imports: [
    FormsModule,
    FormField,
    TranslatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonToggleModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatIconModule,
    InlineMessage,
  ],
  templateUrl: './onboarding-page.html',
  styleUrl: './onboarding-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPage {
  private readonly userStore = inject(UserStore);
  private readonly settingsStore = inject(SettingsStore);
  private readonly geolocation = inject(Geolocation);
  private readonly appStateRepository = inject(AppStateRepository);

  readonly totalSteps = 5;
  readonly step = signal(0);
  readonly progress = computed(() => Math.round(((this.step() + 1) / this.totalSteps) * 100));

  private readonly model = signal<OnboardingFormValue>({
    name: '',
    language: 'en',
    theme: 'system',
    firstDayOfWeek: 6,
  });
  readonly onboardingForm = form(this.model, onboardingSchema);

  readonly locationMode = signal<'gps' | 'manual'>('gps');
  readonly citySuggestions = signal<CityEntry[]>([]);
  readonly selectedCity = signal<CityEntry | null>(null);
  readonly locatingGps = signal(false);
  readonly gpsError = signal<string | null>(null);
  readonly gpsCoords = signal<{ lat: number; lng: number } | null>(null);

  readonly saving = signal(false);

  readonly languageOptions = LANGUAGE_OPTIONS;
  readonly themeOptions = THEME_OPTIONS;
  readonly weekDayOptions = WEEK_DAY_OPTIONS;

  readonly canContinue = computed(() => {
    switch (this.step()) {
      case 0:
        return this.onboardingForm.name().valid();
      case 3:
        return this.locationMode() === 'gps' ? !!this.gpsCoords() : !!this.selectedCity();
      default:
        return true;
    }
  });

  next(): void {
    if (this.step() < this.totalSteps - 1) {
      this.step.set(this.step() + 1);
    } else {
      void submit(this.onboardingForm, () => this.finish());
    }
  }

  back(): void {
    if (this.step() > 0) {
      this.step.set(this.step() - 1);
    }
  }

  setTheme(theme: ThemeMode): void {
    this.onboardingForm.theme().value.set(theme);
  }

  isThemeSelected(theme: ThemeMode): boolean {
    return this.onboardingForm.theme().value() === theme;
  }

  async useGps(): Promise<void> {
    this.locationMode.set('gps');
    this.locatingGps.set(true);
    this.gpsError.set(null);
    try {
      const location = await this.geolocation.getCurrentPosition();
      this.gpsCoords.set({ lat: location.latitude, lng: location.longitude });
    } catch {
      this.gpsError.set('gps-denied');
      this.gpsCoords.set(null);
    } finally {
      this.locatingGps.set(false);
    }
  }

  useManualEntry(): void {
    this.locationMode.set('manual');
    this.gpsCoords.set(null);
  }

  async searchCities(query: string): Promise<void> {
    this.citySuggestions.set(await this.geolocation.searchCities(query));
  }

  onCitySelected(event: MatAutocompleteSelectedEvent): void {
    this.selectedCity.set(event.option.value as CityEntry);
  }

  cityDisplayFn = (city: CityEntry | null): string => (city ? `${city.city}, ${city.country}` : '');

  private async finish(): Promise<void> {
    this.saving.set(true);
    try {
      const values = this.onboardingForm().value();

      await this.userStore.setName(values.name.trim());

      const location =
        this.locationMode() === 'gps' && this.gpsCoords()
          ? {
              type: 'gps' as const,
              latitude: this.gpsCoords()!.lat,
              longitude: this.gpsCoords()!.lng,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }
          : this.selectedCity()
            ? this.geolocation.toManualLocation(this.selectedCity()!)
            : null;

      await this.settingsStore.update({
        language: values.language,
        theme: values.theme,
        firstDayOfWeek: values.firstDayOfWeek,
        location,
      });

      await this.appStateRepository.markOnboardingComplete();

      // Hard navigation (not the Router) so a freshly-chosen RTL language
      // re-bootstraps the app with Angular Material's Directionality set
      // correctly from the start — it doesn't react to a live dir change.
      window.location.href = '/dashboard';
    } finally {
      this.saving.set(false);
    }
  }
}
