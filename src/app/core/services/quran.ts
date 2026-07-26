import { Service, inject, signal } from '@angular/core';
import { QuranRepository } from '../data/repositories/quran-repository';
import { QURAN_TOTAL_PAGES, QuranProgressState } from '../models/quran.model';
import { IsoDate } from '../models/common.model';
import { PRAYER_NAMES, PrayerName } from '../models/prayer.model';
import { SettingsStore } from './settings-store';

export interface PrayerPageRange {
  start: number;
  end: number;
}

@Service()
export class Quran {
  private readonly quranRepository = inject(QuranRepository);
  private readonly settingsStore = inject(SettingsStore);

  readonly progress = signal<QuranProgressState>({
    id: 1,
    currentPage: 1,
    completions: 0,
    updatedAt: new Date().toISOString(),
  });

  async init(): Promise<void> {
    const progress = await this.quranRepository.getProgress();
    this.progress.set(progress);
  }

  private pagesPerPrayer(): number {
    return Math.max(1, this.settingsStore.settings().quranPagePerPry || 1);
  }

  private buildPages(startCursor: number, count: number): { pages: number[]; cursor: number; wraps: number } {
    let cursor = startCursor;
    const pages: number[] = [];
    let wraps = 0;
    for (let i = 0; i < count; i++) {
      pages.push(cursor);
      cursor = cursor === QURAN_TOTAL_PAGES ? (wraps++, 1) : cursor + 1;
    }
    return { pages, cursor, wraps };
  }

  /** Expands a possibly-wrapping start/end range (as stored in the log) into the full list of pages. */
  expandRange(range: PrayerPageRange): number[] {
    const pages: number[] = [range.start];
    let cursor = range.start;
    while (cursor !== range.end) {
      cursor = cursor === QURAN_TOTAL_PAGES ? 1 : cursor + 1;
      pages.push(cursor);
    }
    return pages;
  }

  /** Awards the configured number of sequential pages for a completed prayer, wrapping after 604. */
  async awardPagesForPrayer(date: IsoDate, prayerName: PrayerName): Promise<void> {
    const current = this.progress();
    const { pages, cursor, wraps } = this.buildPages(current.currentPage, this.pagesPerPrayer());

    await this.quranRepository.addLogEntry({
      date,
      prayerName,
      startPage: pages[0],
      endPage: pages[pages.length - 1],
    });

    const updated: QuranProgressState = {
      ...current,
      currentPage: cursor,
      completions: current.completions + wraps,
      updatedAt: new Date().toISOString(),
    };
    await this.quranRepository.saveProgress(updated);
    this.progress.set(updated);
  }

  /** Reverses the award for a prayer completion that was un-checked. */
  async revokePagesForPrayer(date: IsoDate, prayerName: PrayerName): Promise<void> {
    const log = await this.quranRepository.getLog();
    const entry = [...log].reverse().find((e) => e.date === date && e.prayerName === prayerName);
    if (!entry) return;

    const current = this.progress();
    const wrapped = entry.endPage < entry.startPage || current.currentPage <= entry.startPage;
    const updated: QuranProgressState = {
      ...current,
      currentPage: entry.startPage,
      completions: wrapped && current.completions > 0 ? current.completions - 1 : current.completions,
      updatedAt: new Date().toISOString(),
    };
    await this.quranRepository.saveProgress(updated);
    if (entry.id) {
      await this.quranRepository.deleteLogEntry(entry.id);
    }
    this.progress.set(updated);
  }

  /** Human-readable label for the next pages that will be awarded, e.g. "603-604" or "604-1". */
  currentRangeLabel(): string {
    const { pages } = this.buildPages(this.progress().currentPage, this.pagesPerPrayer());
    const start = pages[0];
    const end = pages[pages.length - 1];
    return start === end ? `${start}` : `${start}-${end}`;
  }

  /**
   * Page range assigned to each of today's prayers: the actual awarded range
   * (from the log) for already-completed prayers, and a prospective range —
   * simulated forward from the current cursor — for prayers still pending,
   * in prayer order (Fajr..Isha) so ranges stay sequential.
   */
  async pageRangesForDate(
    date: IsoDate,
    completedPrayers: ReadonlySet<PrayerName>,
  ): Promise<Partial<Record<PrayerName, PrayerPageRange>>> {
    const log = await this.quranRepository.getLog();
    const result: Partial<Record<PrayerName, PrayerPageRange>> = {};
    let cursor = this.progress().currentPage;
    const count = this.pagesPerPrayer();

    for (const name of PRAYER_NAMES) {
      if (completedPrayers.has(name)) {
        const entry = [...log].reverse().find((e) => e.date === date && e.prayerName === name);
        if (entry) {
          result[name] = { start: entry.startPage, end: entry.endPage };
        }
        continue;
      }

      const { pages, cursor: nextCursor } = this.buildPages(cursor, count);
      cursor = nextCursor;
      result[name] = { start: pages[0], end: pages[pages.length - 1] };
    }

    return result;
  }
}
