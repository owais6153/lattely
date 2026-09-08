import { unlink } from 'fs/promises';
import { resolve, sep } from 'path';

import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';

import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';

import { RegisterDto } from './auth.dto';
import { OtpService } from './otp.service';
import { RefreshTokenService } from './refresh-token.service';

const REEL_STORAGE_ROOT = resolve('public/uploads/reels');

@Injectable()
export class AuthService {
  constructor(
    private readonly cfg: ConfigService,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly mail: MailService,
    private readonly otp: OtpService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  private async hashPassword(pw: string) {
    return bcrypt.hash(pw, 10);
  }

  private async verifyPassword(pw: string, hash: string) {
    return bcrypt.compare(pw, hash);
  }

  private accessTtlMinutes() {
    return this.cfg.get<number>('JWT_ACCESS_TTL_MINUTES') ?? 15;
  }

  private signAccess(user: { id: string; email: string; role: string }) {
    return this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.cfg.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: `${this.accessTtlMinutes()}m`,
      },
    );
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    if (!firstName || !lastName)
      throw new BadRequestException('First and last name are required.');

    const birthDate = new Date(`${dto.birthDate}T00:00:00.000Z`);
    const adultCutoff = new Date();
    adultCutoff.setUTCFullYear(adultCutoff.getUTCFullYear() - 18);
    if (Number.isNaN(birthDate.getTime()) || birthDate > adultCutoff) {
      throw new BadRequestException('You must be at least 18 years old.');
    }

    const existing = await this.users.findByEmail(email);
    if (existing) throw new BadRequestException('Email already in use.');

    const created = await this.users.createUser({
      email,
      passwordHash: await this.hashPassword(dto.password),
      role: 'USER',
      isEmailVerified: false,
      reelUploaded: false,
      permissionsCompleted: false,
      gender: dto.gender,
      firstName,
      lastName,
      birthDate: dto.birthDate,

      address: null,
      lat: null,
      lng: null,
      city: null,
      country: null,
      interestedGender: null,
      weekdaysAvailability: null,
      weekendsAvailability: null,
    });

    const { code } = await this.otp.createOrReplace(created, 'VERIFY_EMAIL');
    await this.mail.sendOtpEmail(email, 'VERIFY_EMAIL', code);

    const accessToken = this.signAccess(created);
    const refreshToken = await this.refreshTokens.issue(created);

    return {
      message: 'Registered. OTP sent to email.',
      user: created,
      accessToken,
      refreshToken,
    };
  }

  async resendVerifyOtp(emailRaw: string) {
    const email = emailRaw.toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user) throw new BadRequestException('User not found.');
    if (user.isEmailVerified)
      throw new BadRequestException('Email already verified.');

    await this.otp.enforceResendCooldown(user.id, 'VERIFY_EMAIL');
    const { code } = await this.otp.createOrReplace(user, 'VERIFY_EMAIL');
    await this.mail.sendOtpEmail(email, 'VERIFY_EMAIL', code);

    return { message: 'OTP resent.' };
  }

  async verifyEmail(emailRaw: string, code: string) {
    const email = emailRaw.toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user) throw new BadRequestException('User not found.');

    await this.otp.verify(user.id, 'VERIFY_EMAIL', code);
    const updated = await this.users.markEmailVerified(user.id);

    return {
      message: 'Email verified. Review permissions to continue.',
      user: updated,
    };
  }

  async login(emailRaw: string, password: string) {
    const email = emailRaw.toLowerCase();
    const u = await this.users.findForAuthByEmail(email);
    if (!u) throw new UnauthorizedException('Invalid credentials.');

    const ok = await this.verifyPassword(password, u.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials.');

    const safeUser = await this.users.findById(u.id);
    const accessToken = this.signAccess(u);
    const refreshToken = await this.refreshTokens.issue(u);

    return {
      message: 'Logged in.',
      user: safeUser,
      accessToken,
      refreshToken,
    };
  }

  async forgotPassword(emailRaw: string) {
    const email = emailRaw.toLowerCase();
    const user = await this.users.findByEmail(email);

    if (!user) return { message: 'If the email exists, an OTP has been sent.' };

    await this.otp.enforceResendCooldown(user.id, 'RESET_PASSWORD');
    const { code } = await this.otp.createOrReplace(user, 'RESET_PASSWORD');
    await this.mail.sendOtpEmail(email, 'RESET_PASSWORD', code);

    return { message: 'If the email exists, an OTP has been sent.' };
  }

  async resetPassword(emailRaw: string, code: string, newPassword: string) {
    const email = emailRaw.toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user) throw new BadRequestException('Invalid request.');

    await this.otp.verify(user.id, 'RESET_PASSWORD', code);

    const newHash = await this.hashPassword(newPassword);
    await this.users.updatePasswordHash(user.id, newHash);
    await this.refreshTokens.revokeAll(user.id);

    return { message: 'Password updated. Please login again.' };
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return user;
  }

  async refresh(rawRefreshToken: string) {
    const rotated = await this.refreshTokens.rotate(rawRefreshToken);
    const user = await this.users.findById(rotated.user.id);
    if (!user) throw new UnauthorizedException();

    return {
      message: 'Session refreshed.',
      user,
      accessToken: this.signAccess(rotated.user),
      refreshToken: rotated.refreshToken,
    };
  }

  async logout(rawRefreshToken: string) {
    await this.refreshTokens.revoke(rawRefreshToken);
    return { message: 'Logged out.' };
  }

  async deleteAccount(userId: string, password: string) {
    const user = await this.users.findForAccountDeletion(userId);
    if (!user || !(await this.verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Password is incorrect.');
    }

    const reelPath = user.reel?.videoUrl ? resolve(user.reel.videoUrl) : null;
    if (reelPath && !reelPath.startsWith(`${REEL_STORAGE_ROOT}${sep}`)) {
      throw new BadRequestException('Invalid stored reel path.');
    }

    await this.users.deleteById(userId);
    // The resolved path was constrained to REEL_STORAGE_ROOT above.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (reelPath) await unlink(reelPath).catch(() => undefined);
    return { message: 'Account permanently deleted.' };
  }
}
