import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { FocusTimer } from '../../../core/services/focus-timer';
import { Notification } from '../../../core/services/notification';
import { FocusCountdown } from '../../../core/models/focus.model';
import { Confirm } from '../../../shared/services/confirm';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-stay-focus-page',
  imports: [FormsModule, TranslatePipe, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, EmptyState],
  templateUrl: './stay-focus-page.html',
  styleUrl: './stay-focus-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StayFocusPage {
  private readonly focusTimer = inject(FocusTimer);
  private readonly notification = inject(Notification);
  private readonly confirm = inject(Confirm);
  private readonly translate = inject(TranslateService);

  readonly countdowns = this.focusTimer.countdowns;
  readonly atLimit = this.focusTimer.atLimit;
  readonly active = this.focusTimer.active;

  readonly activeCountdown = computed<FocusCountdown | null>(() => {
    const active = this.active();
    if (!active) return null;
    return this.countdowns().find((c) => c.id === active.countdownId) ?? null;
  });

  readonly remainingLabel = computed(() => {
    const total = this.focusTimer.remainingSeconds();
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  });

  private readonly totalSeconds = computed(() => {
    const active = this.active();
    const countdown = this.activeCountdown();
    if (!active || !countdown) return 0;
    const minutes = active.phase === 'focus' ? countdown.focusMinutes : countdown.breakMinutes;
    return minutes * 60;
  });

  /** 0 (just started) to 1 (finished) — drives the progress ring. */
  readonly progressFraction = computed(() => {
    const total = this.totalSeconds();
    if (!total) return 0;
    return 1 - this.focusTimer.remainingSeconds() / total;
  });

  readonly ringCircumference = 2 * Math.PI * 54;

  readonly ringOffset = computed(() => this.ringCircumference * (1 - this.progressFraction()));

  readonly showAddForm = signal(false);
  readonly newName = signal('');
  readonly newFocusMinutes = signal(25);
  readonly newBreakMinutes = signal(5);

  constructor() {
    void this.focusTimer.init();
  }

  isRunning(countdown: FocusCountdown): boolean {
    return countdown.id != null && this.focusTimer.isRunning(countdown.id);
  }

  phaseLabel(): string {
    const active = this.active();
    if (!active) return '';
    return this.translate.instant(active.phase === 'focus' ? 'stayFocus.focusPhase' : 'stayFocus.breakPhase');
  }

  phaseIsBreak(): boolean {
    return this.active()?.phase === 'break';
  }

  async run(countdown: FocusCountdown): Promise<void> {
    if (!countdown.id) return;
    if (this.notification.isSupported() && this.notification.permission() === 'default') {
      await this.notification.requestPermission();
    }
    this.focusTimer.run(countdown.id);
  }

  stop(): void {
    this.focusTimer.stop();
  }

  async delete(countdown: FocusCountdown): Promise<void> {
    if (!countdown.id) return;
    const confirmed = await this.confirm.ask({
      header: this.translate.instant('stayFocus.deleteConfirmHeader'),
      message: this.translate.instant('stayFocus.deleteConfirmMessage', { name: countdown.name }),
      danger: true,
    });
    if (confirmed) {
      await this.focusTimer.delete(countdown.id);
    }
  }

  openAddForm(): void {
    this.newName.set('');
    this.newFocusMinutes.set(25);
    this.newBreakMinutes.set(5);
    this.showAddForm.set(true);
  }

  cancelAdd(): void {
    this.showAddForm.set(false);
  }

  async saveNew(): Promise<void> {
    const name = this.newName().trim();
    if (!name || this.newFocusMinutes() < 1) return;
    const created = await this.focusTimer.create({
      name,
      focusMinutes: this.newFocusMinutes(),
      breakMinutes: Math.max(0, this.newBreakMinutes()),
    });
    if (created) this.showAddForm.set(false);
  }
}
