import { IsoDate } from './common.model';

/** A saved "Stay Focus" timer preset — just the definition, no run history. */
export interface FocusCountdown {
  id?: number;
  name: string;
  focusMinutes: number;
  breakMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export type FocusPhase = 'focus' | 'break';

/** In-memory only — not persisted; resets if the app reloads mid-run. */
export interface ActiveFocusSession {
  countdownId: number;
  phase: FocusPhase;
  startedAt: number;
  endsAt: number;
}

/** A completed (or manually stopped) focus-phase run, kept for history/statistics. */
export interface FocusSessionEntry {
  id?: number;
  countdownId: number;
  /** Denormalized so history survives the preset being deleted later. */
  countdownName: string;
  /** Calendar day the session started on, for per-day totals. */
  date: IsoDate;
  durationSeconds: number;
  startedAt: string;
  endedAt: string;
}

export const MAX_FOCUS_COUNTDOWNS = 20;

/** Sessions shorter than this are treated as accidental starts/stops and not recorded. */
export const MIN_RECORDED_FOCUS_SECONDS = 10;
