import { IsoDate } from './common.model';

export interface FocusCountdown {
  id?: number;
  name: string;
  focusMinutes: number;
  breakMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export type FocusPhase = 'focus' | 'break';

export interface ActiveFocusSession {
  countdownId: number;
  phase: FocusPhase;
  startedAt: number;
  endsAt: number;
}
export interface FocusSessionEntry {
  id?: number;
  countdownId: number;
  countdownName: string;
  date: IsoDate;
  durationSeconds: number;
  startedAt: string;
  endedAt: string;
}

export const MAX_FOCUS_COUNTDOWNS = 20;

export const MIN_RECORDED_FOCUS_SECONDS = 10;
