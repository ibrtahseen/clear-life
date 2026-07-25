import { Service, inject, signal } from '@angular/core';
import { QuranRepository } from '../data/repositories/quran-repository';
import { QURAN_TOTAL_PAGES, PAGES_PER_PRAYER, QuranProgressState } from '../models/quran.model';
import { IsoDate } from '../models/common.model';
import { PRAYER_NAMES, PrayerName } from '../models/prayer.model';

export interface PrayerPageRange {
  start: number;
  end: number;
}

function nextPage(page: number): number {
  return page >= QURAN_TOTAL_PAGES ? 1 : page + 1;
}

@Service()
export class Quran {
  private readonly quranRepository = inject(QuranRepository);

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

  /** Awards PAGES_PER_PRAYER sequential pages for a completed prayer, wrapping after 604. */
  async awardPagesForPrayer(date: IsoDate, prayerName: PrayerName): Promise<void> {
    const current = this.progress();
    let cursor = current.currentPage;
    const pages: number[] = [];
    let wraps = 0;
    for (let i = 0; i < PAGES_PER_PRAYER; i++) {
      pages.push(cursor);
      cursor = cursor === QURAN_TOTAL_PAGES ? (wraps++, 1) : cursor + 1;
    }

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
    const start = this.progress().currentPage;
    const end = nextPage(start);
    return `${start}-${end}`;
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

    for (const name of PRAYER_NAMES) {
      if (completedPrayers.has(name)) {
        const entry = [...log].reverse().find((e) => e.date === date && e.prayerName === name);
        if (entry) {
          result[name] = { start: entry.startPage, end: entry.endPage };
        }
        continue;
      }

      const pages: number[] = [];
      for (let i = 0; i < PAGES_PER_PRAYER; i++) {
        pages.push(cursor);
        cursor = cursor === QURAN_TOTAL_PAGES ? 1 : cursor + 1;
      }
      result[name] = { start: pages[0], end: pages[pages.length - 1] };
    }

    return result;
  }
}
