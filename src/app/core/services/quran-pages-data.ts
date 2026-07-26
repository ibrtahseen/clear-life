import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface QuranPageVerse {
  /** Ayah number within the surah; 0 = the opening Bismillah line. */
  ayah: number;
  text: string;
}

export interface QuranPageSurahBlock {
  surahName: string;
  verses: QuranPageVerse[];
}

interface RawQuranPage {
  page_index: number;
  verses_by_sura: Record<string, { index: number; text: string }[]>;
}

/** Surah At-Tawbah is the one surah with no opening Bismillah in the real mushaf. */
const AT_TAWBAH = 'التوبة';

/**
 * Serves Quran page text from the bundled `assets/data/quran_by_pages.json`
 * (all 604 pages, Uthmani Arabic only) instead of a remote API, so reading a
 * page never depends on network access. Loaded once and cached in memory.
 */
@Service()
export class QuranPagesData {
  private readonly http = inject(HttpClient);
  private pagesPromise: Promise<RawQuranPage[]> | null = null;

  private load(): Promise<RawQuranPage[]> {
    if (!this.pagesPromise) {
      this.pagesPromise = firstValueFrom(this.http.get<RawQuranPage[]>('assets/data/quran_by_pages.json'));
    }
    return this.pagesPromise;
  }

  async getPage(pageNumber: number): Promise<QuranPageSurahBlock[]> {
    const pages = await this.load();
    const page = pages.find((p) => p.page_index === pageNumber);
    if (!page) return [];

    return Object.entries(page.verses_by_sura).map(([surahName, verses]) => ({
      surahName,
      verses: verses
        .filter((v) => !(v.index === 0 && surahName === AT_TAWBAH))
        .map((v) => ({ ayah: v.index, text: v.text })),
    }));
  }
}
