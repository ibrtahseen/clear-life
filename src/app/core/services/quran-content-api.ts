import { Service, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE_URL = 'https://ummahapi.com/api';
const DEFAULT_TRANSLATION = 'sahih_international';

export interface MushafWord {
  position: number;
  textUthmani: string;
  lineNumber: number;
  charType: string;
  verseKey: string;
  surahNumber: number;
  ayahNumber: number;
}

export interface MushafPage {
  pageNumber: number;
  totalPages: number;
  words: MushafWord[];
}

export interface SurahVerse {
  verseKey: string;
  ayah: number;
  arabic: string;
  transliteration: string;
  translation: string;
}

export interface SurahInfo {
  number: number;
  nameArabic: string;
  nameEnglish: string;
  nameTranslation: string;
}

export interface SurahContent {
  info: SurahInfo;
  versesByKey: Map<string, SurahVerse>;
}

function toMushafPage(payload: unknown, pageNumber: number): MushafPage {
  const data = (payload as Record<string, unknown>)?.['data'] as Record<string, unknown> | undefined;
  const rawWords = (data?.['words'] as Record<string, unknown>[] | undefined) ?? [];
  return {
    pageNumber,
    totalPages: Number(data?.['total_pages'] ?? 604),
    words: rawWords.map((w) => ({
      position: Number(w['position']),
      textUthmani: String(w['text_uthmani'] ?? ''),
      lineNumber: Number(w['line_number']),
      charType: String(w['char_type_name'] ?? 'word'),
      verseKey: String(w['verse_key'] ?? ''),
      surahNumber: Number(w['surah_number']),
      ayahNumber: Number(w['ayah_number']),
    })),
  };
}

function toSurahContent(payload: unknown): SurahContent {
  const data = (payload as Record<string, unknown>)?.['data'] as Record<string, unknown> | undefined;
  const surah = data?.['surah'] as Record<string, unknown> | undefined;
  const rawVerses = (data?.['verses'] as Record<string, unknown>[] | undefined) ?? [];

  const versesByKey = new Map<string, SurahVerse>();
  for (const v of rawVerses) {
    const verseKey = String(v['verse_key']);
    versesByKey.set(verseKey, {
      verseKey,
      ayah: Number(v['ayah']),
      arabic: String(v['arabic'] ?? ''),
      transliteration: String(v['transliteration'] ?? ''),
      translation: String(v['translation'] ?? ''),
    });
  }

  return {
    info: {
      number: Number(surah?.['number']),
      nameArabic: String(surah?.['name_arabic'] ?? ''),
      nameEnglish: String(surah?.['name_english'] ?? ''),
      nameTranslation: String(surah?.['name_translation'] ?? ''),
    },
    versesByKey,
  };
}

/**
 * Fetches real Quran page/verse content (Uthmani script + translation) from
 * UmmahAPI so users can actually read the pages awarded by their prayers.
 * Surah responses are cached in memory since adjacent Mushaf pages usually
 * belong to the same surah.
 */
@Service()
export class QuranContentApi {
  private readonly http = inject(HttpClient);
  private readonly surahCache = new Map<string, Promise<SurahContent>>();

  private get headers(): HttpHeaders {
    const key = environment.ummahApiKey;
    return key ? new HttpHeaders({ 'X-API-Key': key }) : new HttpHeaders();
  }

  async fetchMushafPage(pageNumber: number): Promise<MushafPage> {
    const payload = await firstValueFrom(
      this.http.get(`${BASE_URL}/quran/page/${pageNumber}`, { headers: this.headers }),
    );
    return toMushafPage(payload, pageNumber);
  }

  fetchSurah(surahNumber: number, translation = DEFAULT_TRANSLATION): Promise<SurahContent> {
    const cacheKey = `${surahNumber}:${translation}`;
    const cached = this.surahCache.get(cacheKey);
    if (cached) return cached;

    const request = firstValueFrom(
      this.http.get(`${BASE_URL}/quran/surah/${surahNumber}`, {
        params: { translation },
        headers: this.headers,
      }),
    ).then(toSurahContent);

    this.surahCache.set(cacheKey, request);
    return request;
  }
}
