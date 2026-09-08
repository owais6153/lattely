import { BadRequestException } from '@nestjs/common';

function localParts(date: Date, timeZone?: string) {
  if (!timeZone) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      weekday: date.getDay(),
      hour: date.getHours(),
    };
  }

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
      hour: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? '';
    const weekdays: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return {
      year: Number(value('year')),
      month: Number(value('month')),
      day: Number(value('day')),
      weekday: weekdays[value('weekday')] ?? 0,
      hour: Number(value('hour')),
    };
  } catch {
    throw new BadRequestException('Invalid timeZone.');
  }
}

export function isWeekend(d: Date, timeZone?: string) {
  const day = localParts(d, timeZone).weekday;
  return day === 0 || day === 6;
}

// MVP windows (server-side interpretation)
const MORNING_START = 6;
const MORNING_END = 12;
const EVENING_START = 16;
const EVENING_END = 22;

export function assertTodayAndInAvailability(
  proposed: Date,
  availabilitySlot: 'MORNING' | 'EVENING',
  timeZone?: string,
  now = new Date(),
) {
  const proposedParts = localParts(proposed, timeZone);
  const nowParts = localParts(now, timeZone);

  // "today" check (server local day)
  if (
    proposedParts.year !== nowParts.year ||
    proposedParts.month !== nowParts.month ||
    proposedParts.day !== nowParts.day
  ) {
    throw new BadRequestException('You can only request time for today.');
  }

  if (proposed.getTime() <= now.getTime()) {
    throw new BadRequestException('Selected time must be in the future.');
  }

  const hour = proposedParts.hour;

  if (availabilitySlot === 'MORNING') {
    if (hour < MORNING_START || hour >= MORNING_END) {
      throw new BadRequestException(
        'Selected time must be in MORNING window (06:00-12:00).',
      );
    }
  } else {
    if (hour < EVENING_START || hour >= EVENING_END) {
      throw new BadRequestException(
        'Selected time must be in EVENING window (16:00-22:00).',
      );
    }
  }
}

export function buildCoffeeWindow(
  start: Date,
  availabilitySlot: 'MORNING' | 'EVENING',
  timeZone?: string,
  now = new Date(),
) {
  assertTodayAndInAvailability(start, availabilitySlot, timeZone, now);
  if (start.getTime() < now.getTime() + 30 * 60 * 1000) {
    throw new BadRequestException(
      'The coffee window must start at least 30 minutes from now.',
    );
  }
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const startParts = localParts(start, timeZone);
  const endParts = localParts(end, timeZone);
  if (
    startParts.year !== endParts.year ||
    startParts.month !== endParts.month ||
    startParts.day !== endParts.day
  ) {
    throw new BadRequestException(
      'The two-hour window must remain within today.',
    );
  }
  return { start, end };
}
