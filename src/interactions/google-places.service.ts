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
  timeZone?: { id?: string }; // IANA timezone
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

    // Map to Google day numbers: 0=Sunday..6=Saturday (common in APIs)
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

      // 24/7 case: close missing (documented for always-open) :contentReference[oaicite:4]{index=4}
      if (o?.day === 0 && o?.hour === 0 && o?.minute === 0 && !c) return true;

      if (o?.day == null || o.hour == null || o.minute == null) continue;

      const openMin = this.minutesOfWeek(o.day, o.hour, o.minute);

      // if close missing, assume open-ended (treat as open)
      if (!c || c.day == null || c.hour == null || c.minute == null) {
        if (now >= openMin) return true;
        continue;
      }

      const closeMin = this.minutesOfWeek(c.day, c.hour, c.minute);

      // Normal (same week window)
      if (closeMin > openMin) {
        if (now >= openMin && now < closeMin) return true;
      } else {
        // Overnight wrap (e.g. open Fri 20:00 close Sat 02:00)
        if (now >= openMin || now < closeMin) return true;
      }
    }

    return false;
  }

  async nearbyRestaurants(
    midLat: number,
    midLng: number,
    proposedStartAtISO: string,
  ) {
    const proposed = new Date(proposedStartAtISO);
    if (Number.isNaN(proposed.getTime()))
      throw new BadRequestException('Invalid proposedStartAt');

    const url = 'https://places.googleapis.com/v1/places:searchNearby';

    // Nearby Search (New) POST + FieldMask header is required :contentReference[oaicite:5]{index=5}
    const res = await fetch(url, {
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
    });

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new BadRequestException(`Google Places error: ${res.status} ${t}`);
    }

    const data = (await res.json()) as { places?: Place[] };
    const places = data.places || [];

    const confirmedOpen: any[] = [];
    const unknownOrUnverifiable: any[] = [];

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
      let canVerify = false;

      if (tz && periods.length) {
        canVerify = true;
        openAtTime = this.isOpenAt(proposed, tz, periods);
      }

      const item = {
        googlePlaceId: id,
        name,
        address,
        lat,
        lng,
        openAtProposedTime: canVerify ? openAtTime : false,
        availabilityVerified: canVerify,
      };

      if (canVerify && openAtTime) confirmedOpen.push(item);
      else unknownOrUnverifiable.push(item);
    }

    // If we found verified-open restaurants, return only those.
    // Otherwise return the best-effort list (availability might not be verifiable for some places).
    if (confirmedOpen.length > 0)
      return {
        items: confirmedOpen,
        availabilityMode: 'VERIFIED_OPEN' as const,
      };

    return {
      items: unknownOrUnverifiable,
      availabilityMode: 'BEST_EFFORT' as const,
    };
  }
}
