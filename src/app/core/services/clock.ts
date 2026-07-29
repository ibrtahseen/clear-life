import { Service, signal } from '@angular/core';

const TICK_INTERVAL_MS = 30_000;

/** Shared wall-clock tick so computeds depending on "now" (countdowns, reminders) stay live without each owning an interval. */
@Service()
export class Clock {
  readonly now = signal(Date.now());

  constructor() {
    setInterval(() => this.now.set(Date.now()), TICK_INTERVAL_MS);
  }
}
