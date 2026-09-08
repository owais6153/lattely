import { BadRequestException } from '@nestjs/common';

import { assertAdultBirthDate } from './age-rules';

describe('adult birth-date validation', () => {
  const now = new Date('2026-09-09T12:00:00.000Z');

  it('accepts someone who is exactly 18', () => {
    expect(() => assertAdultBirthDate('2008-09-09', now)).not.toThrow();
  });

  it('rejects minors and impossible calendar dates', () => {
    expect(() => assertAdultBirthDate('2008-09-10', now)).toThrow(
      BadRequestException,
    );
    expect(() => assertAdultBirthDate('2000-02-31', now)).toThrow(
      'valid date of birth',
    );
  });
});
