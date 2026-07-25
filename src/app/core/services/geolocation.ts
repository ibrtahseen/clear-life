import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GeoLocation } from '../models/common.model';

export interface CityEntry {
  city: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
}

@Service()
export class Geolocation {
  private readonly http = inject(HttpClient);
  private cityCache: CityEntry[] | null = null;

  isGpsSupported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.geolocation;
  }

  async getCurrentPosition(): Promise<GeoLocation> {
    if (!this.isGpsSupported()) {
      throw new Error('Geolocation is not supported on this device.');
    }
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
    });
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
      type: 'gps',
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timezone,
    };
  }

  async loadCities(): Promise<CityEntry[]> {
    if (this.cityCache) {
      return this.cityCache;
    }
    const cities = await firstValueFrom(this.http.get<CityEntry[]>('assets/data/cities.json'));
    this.cityCache = cities;
    return cities;
  }

  async searchCities(query: string): Promise<CityEntry[]> {
    const cities = await this.loadCities();
    const q = query.trim().toLowerCase();
    if (!q) {
      return cities.slice(0, 20);
    }
    return cities
      .filter((c) => c.city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q))
      .slice(0, 20);
  }

  toManualLocation(city: CityEntry): GeoLocation {
    return {
      type: 'manual',
      latitude: city.lat,
      longitude: city.lng,
      city: city.city,
      country: city.country,
      timezone: city.timezone,
    };
  }
}
