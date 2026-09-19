import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  Max,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import type {
  AvailabilityDay,
  AvailabilitySlot,
  Gender,
  Interest,
  InterestedGender,
} from './user.entity';

const INTERESTS: Interest[] = [
  'COFFEE',
  'MUSIC',
  'ART',
  'TRAVEL',
  'FITNESS',
  'BOOKS',
  'FOOD',
  'MOVIES',
  'GAMING',
  'NATURE',
  'PHOTOGRAPHY',
  'FASHION',
  'SPORTS',
  'COOKING',
  'DOGS',
];

const DAYS: AvailabilityDay[] = [
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
  'SUN',
];

export class TimeWindowDto {
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  start: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  end: string;
}

export class CoffeeAvailabilityDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsIn(DAYS, { each: true })
  days: AvailabilityDay[];

  @IsObject()
  @ValidateNested()
  @Type(() => TimeWindowDto)
  timeWindow: TimeWindowDto;
}

export class UpdateProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  lastName: string;

  @IsEnum(['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY'])
  gender: Gender;

  @IsDateString({ strict: true })
  birthDate: string;

  @IsEnum(['MALE', 'FEMALE', 'NON_BINARY', 'DOESNT_MATTER'])
  interestedGender: InterestedGender;
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
  @IsOptional()
  @IsEnum(['MALE', 'FEMALE', 'NON_BINARY', 'DOESNT_MATTER'])
  interestedGender?: InterestedGender;

  @IsOptional()
  @IsEnum(['MORNING', 'EVENING'])
  weekdaysAvailability?: AvailabilitySlot;

  @IsOptional()
  @IsEnum(['MORNING', 'EVENING'])
  weekendsAvailability?: AvailabilitySlot;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(15)
  @IsIn(INTERESTS, { each: true })
  interests?: Interest[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CoffeeAvailabilityDto)
  coffeeAvailability?: CoffeeAvailabilityDto;
}
