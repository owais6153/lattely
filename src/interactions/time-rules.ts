import { BadRequestException } from '@nestjs/common';

export function isWeekend(d: Date) {
  const day = d.getDay(); // 0 Sun ... 6 Sat
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
) {
  const now = new Date();

  // "today" check (server local day)
  if (
    proposed.getFullYear() !== now.getFullYear() ||
    proposed.getMonth() !== now.getMonth() ||
    proposed.getDate() !== now.getDate()
  ) {
    throw new BadRequestException('You can only request time for today.');
  }

  const hour = proposed.getHours();

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
