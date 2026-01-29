import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type PeriodPoint = { day?: number; hour?: number; minute?: number };
type Period = { open?: PeriodPoint; close?: PeriodPoint };

type Place = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  regularOpeningHours?: { periods?: Period[] };
  timeZone?: { id?: string };
};

type Candidate = {
  googlePlaceId: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  openAtProposedTime: boolean;
  availabilityVerified: boolean;
  distanceMeters: number;
};

@Injectable()
export class GooglePlacesService {
  constructor(private readonly cfg: ConfigService) {}

  private apiKey() {
    const key = this.cfg.get<string>('GOOGLE_PLACES_API_KEY');
    if (!key) throw new BadRequestException('Missing GOOGLE_PLACES_API_KEY');
    return key;
  }

  private radiusMeters() {
    return Number(
      this.cfg.get<string>('GOOGLE_PLACES_RADIUS_METERS') || '2000',
    );
  }

  private maxResults() {
    return Number(this.cfg.get<string>('GOOGLE_PLACES_MAX_RESULTS') || '10');
  }

  private haversineMeters(
    aLat: number,
    aLng: number,
    bLat: number,
    bLng: number,
  ) {
    const R = 6371000;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const s1 = Math.sin(dLat / 2);
    const s2 = Math.sin(dLng / 2);
    const aa =
      s1 * s1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * s2 * s2;
    return 2 * R * Math.asin(Math.sqrt(aa));
  }

  private asLocalParts(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const weekday = parts.find((p) => p.type === 'weekday')?.value || 'Mon';
    const hour = Number(parts.find((p) => p.type === 'hour')?.value || '0');
    const minute = Number(parts.find((p) => p.type === 'minute')?.value || '0');

    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const day = dayMap[weekday] ?? 1;

    return { day, hour, minute };
  }

  private minutesOfWeek(day: number, hour: number, minute: number) {
    return day * 24 * 60 + hour * 60 + minute;
  }

  private isOpenAt(date: Date, timeZone: string, periods: Period[]): boolean {
    if (!periods?.length) return false;

    const { day, hour, minute } = this.asLocalParts(date, timeZone);
    const now = this.minutesOfWeek(day, hour, minute);

    for (const p of periods) {
      const o = p.open;
      const c = p.close;

      // 24/7 case (close missing)
      if (o?.day === 0 && o?.hour === 0 && o?.minute === 0 && !c) return true;

      if (o?.day == null || o.hour == null || o.minute == null) continue;
      const openMin = this.minutesOfWeek(o.day, o.hour, o.minute);

      if (!c || c.day == null || c.hour == null || c.minute == null) {
        if (now >= openMin) return true;
        continue;
      }

      const closeMin = this.minutesOfWeek(c.day, c.hour, c.minute);

      if (closeMin > openMin) {
        if (now >= openMin && now < closeMin) return true;
      } else {
        if (now >= openMin || now < closeMin) return true;
      }
    }

    return false;
  }

  async pickOneRestaurant(
    midLat: number,
    midLng: number,
    proposedStartAtISO: string,
  ) {
    const proposed = new Date(proposedStartAtISO);
    if (Number.isNaN(proposed.getTime()))
      throw new BadRequestException('Invalid proposedStartAt');

    const res = await fetch(
      'https://places.googleapis.com/v1/places:searchNearby',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey(),
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location,places.regularOpeningHours,places.timeZone',
        },
        body: JSON.stringify({
          includedTypes: ['restaurant'],
          maxResultCount: this.maxResults(),
          locationRestriction: {
            circle: {
              center: { latitude: midLat, longitude: midLng },
              radius: this.radiusMeters(),
            },
          },
        }),
      },
    );

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new BadRequestException(`Google Places error: ${res.status} ${t}`);
    }

    const data = (await res.json()) as { places?: Place[] };
    const places = data.places || [];

    const candidates: Candidate[] = [];

    for (const p of places) {
      const id = p.id;
      const name = p.displayName?.text || 'Restaurant';
      const address = p.formattedAddress || null;
      const lat = p.location?.latitude;
      const lng = p.location?.longitude;
      if (!id || lat == null || lng == null) continue;

      const periods = p.regularOpeningHours?.periods || [];
      const tz = p.timeZone?.id;

      let openAtTime = false;
      let verified = false;

      if (tz && periods.length) {
        verified = true;
        openAtTime = this.isOpenAt(proposed, tz, periods);
      }

      candidates.push({
        googlePlaceId: id,
        name,
        address,
        lat,
        lng,
        openAtProposedTime: verified ? openAtTime : false,
        availabilityVerified: verified,
        distanceMeters: this.haversineMeters(midLat, midLng, lat, lng),
      });
    }

    if (candidates.length === 0)
      throw new BadRequestException('No restaurants found nearby.');

    // Prefer verified-open restaurants if possible, then nearest to midpoint
    const verifiedOpen = candidates.filter(
      (c) => c.availabilityVerified && c.openAtProposedTime,
    );
    const pool = verifiedOpen.length ? verifiedOpen : candidates;

    pool.sort((a, b) => a.distanceMeters - b.distanceMeters);

    const chosen = pool[0];

    return {
      chosen,
      availabilityMode: verifiedOpen.length ? 'VERIFIED_OPEN' : 'BEST_EFFORT',
    };
  }
}
