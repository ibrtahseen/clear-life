import { Service, signal } from '@angular/core';

const TICK_INTERVAL_MS = 30_000;

@Service()
export class Clock {
  readonly now = signal(Date.now());

  constructor() {
    setInterval(() => this.now.set(Date.now()), TICK_INTERVAL_MS);
  }
}
