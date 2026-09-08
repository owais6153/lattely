import {
  IsDateString,
  IsBoolean,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ArrayMaxSize,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { FEEDBACK_TAGS, MEET_AGAIN_CHOICES } from './feedback.constants';
import type { FeedbackTag, MeetAgainChoice } from './feedback.constants';

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

  @IsInt()
  @Min(1)
  @Max(5)
  vibeRating: number;

  @IsEnum(MEET_AGAIN_CHOICES)
  wouldMeetAgain: MeetAgainChoice;

  @IsArray()
  @ArrayMaxSize(FEEDBACK_TAGS.length)
  @IsEnum(FEEDBACK_TAGS, { each: true })
  tags: FeedbackTag[];

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
