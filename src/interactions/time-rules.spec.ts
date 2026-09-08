import { BadRequestException } from '@nestjs/common';

import { assertTodayAndInAvailability, buildCoffeeWindow, isWeekend } from './time-rules';

describe('date availability time zones', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-08T00:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('evaluates the calendar day in the supplied time zone', () => {
    expect(isWeekend(new Date('2026-09-05T01:00:00.000Z'), 'Asia/Karachi')).toBe(
      true,
    );
    expect(isWeekend(new Date('2026-09-05T01:00:00.000Z'), 'America/Los_Angeles')).toBe(
      false,
    );
  });

  it('accepts a same-day morning in the user time zone', () => {
    expect(() =>
      assertTodayAndInAvailability(
        new Date('2026-09-08T06:00:00.000Z'),
        'MORNING',
        'Asia/Karachi',
      ),
    ).not.toThrow();
  });

  it('rejects invalid time zones and out-of-window times', () => {
    expect(() =>
      assertTodayAndInAvailability(
        new Date('2026-09-08T10:00:00.000Z'),
        'MORNING',
        'Invalid/TimeZone',
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      assertTodayAndInAvailability(
        new Date('2026-09-08T15:00:00.000Z'),
        'MORNING',
        'UTC',
      ),
    ).toThrow('MORNING window');
  });

  it('builds an exact two-hour coffee window with a 30-minute buffer', () => {
    const window = buildCoffeeWindow(
      new Date('2026-09-08T17:00:00.000Z'),
      'EVENING',
      'UTC',
    );
    expect(window.end.getTime() - window.start.getTime()).toBe(7_200_000);
    expect(() =>
      buildCoffeeWindow(
        new Date('2026-09-08T06:15:00.000Z'),
        'MORNING',
        'UTC',
        new Date('2026-09-08T06:00:00.000Z'),
      ),
    ).toThrow('at least 30 minutes');
    expect(() =>
      buildCoffeeWindow(
        new Date('2026-09-08T11:00:00.000Z'),
        'MORNING',
        'UTC',
        new Date('2026-09-08T06:00:00.000Z'),
      ),
    ).toThrow('fit within the selected availability');
  });
});
