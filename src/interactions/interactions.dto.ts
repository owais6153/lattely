import {
  IsDateString,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDateRequestDto {
  @IsDateString()
  windowStartAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timeZone?: string;
}

export class RespondDto {
  @IsEnum(['CONFIRM', 'DECLINE'])
  action: 'CONFIRM' | 'DECLINE';
}

export class PostCallDecisionDto {
  @IsEnum(['YES', 'NO'])
  decision: 'YES' | 'NO';
}

export class FeedbackDto {
  @IsBoolean()
  attended: boolean;

  @IsBoolean()
  feltSafe: boolean;

  @IsBoolean()
  wouldMeetAgain: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class SafetyReportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;

  @IsOptional()
  @IsString()
  requestId?: string;
}

export class ModerateReportDto {
  @IsEnum(['REVIEWED', 'CLOSED'])
  status: 'REVIEWED' | 'CLOSED';
}
