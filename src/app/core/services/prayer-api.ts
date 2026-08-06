import { Service, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PRAYER_NAMES, PrayerName } from '../models/prayer.model';
import { environment } from '../../../environments/environment';

const BASE_URL = 'https://ummahapi.com/api';

export interface PrayerApiQuery {
  latitude: number;
  longitude: number;
  date?: string;
  method?: string;
  madhab?: 'Hanafi' | 'Shafi';
  timezone?: string;
}

type RawTimings = Record<string, string>;

function extractTimings(payload: unknown): RawTimings | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = payload as Record<string, unknown>;
  const data = obj['data'] as Record<string, unknown> | undefined;
  const candidates = [obj, data, data?.['prayer_times'], data?.['timings'], obj['timings'], obj['times']];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      const rec = candidate as Record<string, unknown>;
      const hasAny = PRAYER_NAMES.some((name) => name in lowercaseKeys(rec));
      if (hasAny) return lowercaseKeys(rec) as RawTimings;
    }
  }
  return null;
}

function lowercaseKeys(rec: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(rec)) {
    if (typeof value === 'string') {
      out[key.toLowerCase()] = normalizeTimeString(value);
    }
  }
  return out;
}

function normalizeTimeString(value: string): string {
  const match = value.match(/(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : value;
}

@Service()
export class PrayerApi {
  private readonly http = inject(HttpClient);

  private get headers(): HttpHeaders {
    const key = environment.ummahApiKey;
    return key ? new HttpHeaders({ 'X-API-Key': key }) : new HttpHeaders();
  }

  async fetchDailyTimes(query: PrayerApiQuery): Promise<Record<PrayerName, string>> {
    const params: Record<string, string> = {
      lat: String(query.latitude),
      lng: String(query.longitude),
    };
    if (query.date) params['date'] = query.date;
    if (query.method) params['method'] = query.method;
    if (query.madhab) params['madhab'] = query.madhab;
    if (query.timezone) params['timezone'] = query.timezone;

    const payload = await this.withRetry(() =>
      firstValueFrom(this.http.get(`${BASE_URL}/prayer-times`, { params, headers: this.headers })),
    );

    const timings = extractTimings(payload);
    if (!timings) {
      throw new Error('Unexpected prayer-times response shape from UmmahAPI.');
    }

    const result = {} as Record<PrayerName, string>;
    for (const name of PRAYER_NAMES) {
      const value = timings[name];
      if (!value) {
        throw new Error(`Missing ${name} time in UmmahAPI response.`);
      }
      result[name] = value;
    }
    return result;
  }

  private async withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 800): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return this.withRetry(fn, retries - 1, delayMs * 2);
    }
  }
}
