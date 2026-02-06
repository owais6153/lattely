import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';
import type { AvailabilitySlot, InterestedGender } from './user.entity';

export class UpdateLocationDto {
  @IsString()
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
