import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class CreateDateRequestDto {
  @IsDateString()
  proposedStartAt: string;

  // 30 min to 4 hours, default 90 min
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(14400)
  durationSec?: number;
}

export class RespondDto {
  @IsEnum(['ACCEPT', 'REJECT', 'COUNTER'])
  action: 'ACCEPT' | 'REJECT' | 'COUNTER';

  // COUNTER requires new proposed time
  @IsOptional()
  @IsDateString()
  proposedStartAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(14400)
  durationSec?: number;
}
