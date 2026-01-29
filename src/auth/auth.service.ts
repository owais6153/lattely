import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { OtpService } from './otp.service';
import { RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly cfg: ConfigService,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly mail: MailService,
    private readonly otp: OtpService,
  ) {}

  private async hashPassword(pw: string) {
    return bcrypt.hash(pw, 10);
  }

  private async verifyPassword(pw: string, hash: string) {
    return bcrypt.compare(pw, hash);
  }

  private accessTtlDays() {
    return Number(this.cfg.get<string>('JWT_ACCESS_TTL_DAYS') || '30');
  }

  private signAccess(user: { id: string; email: string; role: string }) {
    return this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.cfg.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: `${this.accessTtlDays()}d`,
      },
    );
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();

    const existing = await this.users.findByEmail(email);
    if (existing) throw new BadRequestException('Email already in use.');

    const created = await this.users.createUser({
      email,
      passwordHash: await this.hashPassword(dto.password),
      role: 'USER',
      isEmailVerified: false,
      reelUploaded: false,
      gender: dto.gender,

      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),

      address: dto.address.trim(),
      lat: dto.lat,
      lng: dto.lng,
      city: dto.city?.trim() ?? null,
      country: dto.country?.trim() ?? null,
    });

    const { code } = await this.otp.createOrReplace(
      created as any,
      'VERIFY_EMAIL',
    );
    await this.mail.sendOtpEmail(email, 'VERIFY_EMAIL', code);

    const accessToken = this.signAccess(created as any);

    return {
      message: 'Registered. OTP sent to email.',
      user: created,
      accessToken,
    };
  }

  async resendVerifyOtp(emailRaw: string) {
    const email = emailRaw.toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user) throw new BadRequestException('User not found.');
    if (user.isEmailVerified)
      throw new BadRequestException('Email already verified.');

    await this.otp.enforceResendCooldown(user.id, 'VERIFY_EMAIL');
    const { code } = await this.otp.createOrReplace(
      user as any,
      'VERIFY_EMAIL',
    );
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
      message: 'Email verified. Please upload your reel to continue.',
      user: updated,
    };
  }

  async login(emailRaw: string, password: string) {
    const email = emailRaw.toLowerCase();
    const u = await this.users.findForAuthByEmail(email);
    if (!u) throw new UnauthorizedException('Invalid credentials.');

    const ok = await this.verifyPassword(password, u.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials.');

    const accessToken = this.signAccess(u);
    const safeUser = await this.users.findById(u.id);

    return {
      message: 'Logged in.',
      user: safeUser,
      accessToken,
    };
  }

  async forgotPassword(emailRaw: string) {
    const email = emailRaw.toLowerCase();
    const user = await this.users.findByEmail(email);

    if (!user) return { message: 'If the email exists, an OTP has been sent.' };

    await this.otp.enforceResendCooldown(user.id, 'RESET_PASSWORD');
    const { code } = await this.otp.createOrReplace(
      user as any,
      'RESET_PASSWORD',
    );
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

    return { message: 'Password updated. Please login again.' };
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
