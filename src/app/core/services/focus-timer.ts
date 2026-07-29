import { Service, computed, inject, signal } from '@angular/core';
import { FocusCountdownRepository } from '../data/repositories/focus-countdown-repository';
import { FocusSessionRepository } from '../data/repositories/focus-session-repository';
import { Notification } from './notification';
import { I18n } from './i18n';
import {
  ActiveFocusSession,
  FocusCountdown,
  FocusPhase,
  MAX_FOCUS_COUNTDOWNS,
  MIN_RECORDED_FOCUS_SECONDS,
} from '../models/focus.model';
import { toIsoDate } from '../utils/date.util';

@Service()
export class FocusTimer {
  private readonly repository = inject(FocusCountdownRepository);
  private readonly sessionRepository = inject(FocusSessionRepository);
  private readonly notification = inject(Notification);
  private readonly i18n = inject(I18n);

  readonly countdowns = signal<FocusCountdown[]>([]);
  /** In-memory only — resets if the app reloads mid-run; no run history is kept. */
  readonly active = signal<ActiveFocusSession | null>(null);
  readonly now = signal(Date.now());

  readonly atLimit = computed(() => this.countdowns().length >= MAX_FOCUS_COUNTDOWNS);

  readonly remainingSeconds = computed(() => {
    const active = this.active();
    if (!active) return 0;
    return Math.max(0, Math.round((active.endsAt - this.now()) / 1000));
  });

  private tickHandle: ReturnType<typeof setInterval> | null = null;

  async init(): Promise<void> {
    this.countdowns.set(await this.repository.getAll());
  }

  async create(input: { name: string; focusMinutes: number; breakMinutes: number }): Promise<boolean> {
    if (this.atLimit()) return false;
    const created = await this.repository.create(input);
    this.countdowns.update((list) => [...list, created]);
    return true;
  }

  async delete(id: number): Promise<void> {
    if (this.active()?.countdownId === id) this.stop();
    await this.repository.delete(id);
    this.countdowns.update((list) => list.filter((c) => c.id !== id));
  }

  /** Starts a countdown's focus phase; stops whichever countdown was previously running. */
  run(id: number): void {
    const countdown = this.countdowns().find((c) => c.id === id);
    if (!countdown) return;
    if (this.active()) this.stop();
    this.startPhase(countdown, 'focus');
  }

  stop(): void {
    const active = this.active();
    if (active) void this.recordSession(active, Date.now());
    this.endActive();
  }

  isRunning(id: number): boolean {
    return this.active()?.countdownId === id;
  }

  private startPhase(countdown: FocusCountdown, phase: FocusPhase): void {
    const minutes = phase === 'focus' ? countdown.focusMinutes : countdown.breakMinutes;
    const startedAt = Date.now();
    this.active.set({ countdownId: countdown.id!, phase, startedAt, endsAt: startedAt + minutes * 60_000 });
    this.now.set(startedAt);
    this.startTicking();
  }

  private endActive(): void {
    this.active.set(null);
    this.stopTicking();
  }

  /** Persists elapsed focus time; a no-op for break phases or sessions too short to matter. */
  private async recordSession(active: ActiveFocusSession, endedAt: number): Promise<void> {
    if (active.phase !== 'focus') return;
    const durationSeconds = Math.round((endedAt - active.startedAt) / 1000);
    if (durationSeconds < MIN_RECORDED_FOCUS_SECONDS) return;
    const countdown = this.countdowns().find((c) => c.id === active.countdownId);
    await this.sessionRepository.create({
      countdownId: active.countdownId,
      countdownName: countdown?.name ?? '',
      date: toIsoDate(new Date(active.startedAt)),
      durationSeconds,
      startedAt: new Date(active.startedAt).toISOString(),
      endedAt: new Date(endedAt).toISOString(),
    });
  }

  private startTicking(): void {
    if (this.tickHandle) return;
    this.tickHandle = setInterval(() => this.tick(), 1000);
  }

  private stopTicking(): void {
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  private tick(): void {
    this.now.set(Date.now());
    const active = this.active();
    if (active && Date.now() >= active.endsAt) {
      void this.onPhaseComplete(active);
    }
  }

  private async onPhaseComplete(active: ActiveFocusSession): Promise<void> {
    const countdown = this.countdowns().find((c) => c.id === active.countdownId);
    if (!countdown) {
      this.endActive();
      return;
    }

    if (active.phase === 'focus') {
      await this.recordSession(active, active.endsAt);
      await this.notify(countdown, 'focus-done');
      if (countdown.breakMinutes > 0) {
        this.startPhase(countdown, 'break');
      } else {
        this.endActive();
      }
    } else {
      await this.notify(countdown, 'break-done');
      this.endActive();
    }
  }

  private async notify(countdown: FocusCountdown, event: 'focus-done' | 'break-done'): Promise<void> {
    const body =
      event === 'focus-done'
        ? this.i18n.instant('stayFocus.focusDoneBody', { name: countdown.name })
        : this.i18n.instant('stayFocus.breakDoneBody', { name: countdown.name });
    await this.notification.fire(`focus:${countdown.id}:${event}:${Date.now()}`, 'focus', String(countdown.id), body);
  }
}
