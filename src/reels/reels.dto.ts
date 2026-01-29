import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UploadReelMetaDto {
  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  // Address/location fields (optional)
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  tags?: string[];
}
