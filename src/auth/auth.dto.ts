import {
  IsEmail,
  IsDateString,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import type { Gender } from '../users/user.entity';

export class RegisterDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsEnum(['MALE', 'FEMALE', 'NON_BINARY'])
  gender: Gender;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  lastName: string;

  @IsDateString({ strict: true })
  birthDate: string;
}

export class VerifyEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  code: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class ResendOtpDto {
  @IsEmail()
  email: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  code: string;

  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}

export class RefreshTokenDto {
  @IsString()
  @MinLength(32)
  refreshToken: string;
}

export class DeleteAccountDto {
  @IsString()
  @MinLength(8)
  password: string;
}
