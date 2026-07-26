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
  endsAt: number;
}

export const MAX_FOCUS_COUNTDOWNS = 20;
