import { ChangeDetectionStrategy, Component, computed, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

type Period = 'AM' | 'PM';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

@Component({
  selector: 'app-time-picker',
  imports: [TranslatePipe, MatIconModule],
  templateUrl: './time-picker.html',
  styleUrl: './time-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimePicker {
  /** 24-hour "HH:mm" string, or null when no time is set. */
  readonly value = model<string | null>(null);

  readonly hours = HOURS;
  readonly minutes = MINUTES;

  readonly hasValue = computed(() => !!this.value());

  private readonly parsed = computed<{ h: number; m: number } | null>(() => {
    const v = this.value();
    if (!v) return null;
    const [h, m] = v.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return { h, m };
  });

  readonly hour12 = computed(() => {
    const h = this.parsed()?.h ?? 9;
    const h12 = h % 12;
    return h12 === 0 ? 12 : h12;
  });

  readonly minute = computed(() => this.parsed()?.m ?? 0);

  readonly period = computed<Period>(() => ((this.parsed()?.h ?? 9) < 12 ? 'AM' : 'PM'));

  setHour(hour12: number): void {
    this.commit(hour12, this.minute(), this.period());
  }

  setMinute(minute: number): void {
    this.commit(this.hour12(), minute, this.period());
  }

  setPeriod(period: Period): void {
    this.commit(this.hour12(), this.minute(), period);
  }

  clear(): void {
    this.value.set(null);
  }

  private commit(hour12: number, minute: number, period: Period): void {
    const h = hour12 % 12;
    const h24 = period === 'PM' ? h + 12 : h;
    this.value.set(`${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  }
}
