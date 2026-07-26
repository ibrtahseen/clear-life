import { IsoDate } from './common.model';
import { PrayerName } from './prayer.model';

export const QURAN_TOTAL_PAGES = 604;

export interface QuranProgressState {
  /** Singleton row id, always 1 */
  id: number;
  /** Next page to be read (1-604) */
  currentPage: number;
  /** Number of full Quran completions (khatm) */
  completions: number;
  updatedAt: string;
}

export interface QuranReadingLogEntry {
  id?: number;
  date: IsoDate;
  prayerName: PrayerName;
  startPage: number;
  endPage: number;
  createdAt: string;
}
