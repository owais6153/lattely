import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateDateRequestDto {
  @IsDateString()
  proposedStartAt: string;

  // 30 min to 4 hours
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(14400)
  durationSec?: number;
}

export class RespondDto {
  @IsEnum(['ACCEPT', 'REJECT', 'COUNTER'])
  action: 'ACCEPT' | 'REJECT' | 'COUNTER';

  // Accept requires restaurant option
  @IsOptional()
  @IsString()
  chosenRestaurantOptionId?: string;

  // Counter requires new proposed time
  @IsOptional()
  @IsDateString()
  proposedStartAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(14400)
  durationSec?: number;
}
