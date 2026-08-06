import { IsoDate } from './common.model';
import { PrayerName } from './prayer.model';

export const QURAN_TOTAL_PAGES = 604;

export interface QuranProgressState {
  id: number;
  currentPage: number;
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
