import { BadRequestException } from '@nestjs/common';

export function assertAdultBirthDate(value: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('Date of birth must use YYYY-MM-DD.');
  }
  const birthDate = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(birthDate.getTime()) ||
    birthDate.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException('Enter a valid date of birth.');
  }
  const adultCutoff = new Date(now);
  adultCutoff.setUTCFullYear(adultCutoff.getUTCFullYear() - 18);
  if (birthDate > adultCutoff) {
    throw new BadRequestException('You must be at least 18 years old.');
  }
}
