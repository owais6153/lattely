import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

import type { AvailabilitySlot, Gender, InterestedGender } from './user.entity';

export class UpdateProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  lastName: string;

  @IsEnum(['MALE', 'FEMALE', 'NON_BINARY'])
  gender: Gender;
}

export class UpdateBirthDateDto {
  @IsDateString({ strict: true })
  birthDate: string;
}

export class UpdateLocationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  address: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}

export class UpdatePreferencesDto {
  @IsEnum(['MALE', 'FEMALE', 'NON_BINARY', 'DOESNT_MATTER'])
  interestedGender: InterestedGender;

  @IsEnum(['MORNING', 'EVENING'])
  weekdaysAvailability: AvailabilitySlot;

  @IsEnum(['MORNING', 'EVENING'])
  weekendsAvailability: AvailabilitySlot;
}
