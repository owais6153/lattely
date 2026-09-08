import crypto from 'crypto';

import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/user.entity';

import { Otp, OtpPurpose } from './otp.entity';

@Injectable()
export class OtpService {
  constructor(
    private readonly cfg: ConfigService,
    @InjectRepository(Otp) private readonly repo: Repository<Otp>,
  ) {}

  private hashCode(code: string) {
    const secret =
      this.cfg.get<string>('OTP_HASH_SECRET') ??
      this.cfg.getOrThrow<string>('JWT_ACCESS_SECRET');
    return crypto.createHmac('sha256', secret).update(code).digest('hex');
  }

  generateCode(): string {
    const n = crypto.randomInt(0, 1_000_000);
    return n.toString().padStart(6, '0');
  }

  async createOrReplace(
    user: User,
    purpose: OtpPurpose,
  ): Promise<{ code: string; otp: Otp }> {
    await this.repo.delete({ user: { id: user.id }, purpose });

    const code = this.generateCode();
    const ttlMin = Number(this.cfg.get<string>('OTP_TTL_MIN') || '10');

    const otp = this.repo.create({
      user,
      purpose,
      codeHash: this.hashCode(code),
      expiresAt: new Date(Date.now() + ttlMin * 60 * 1000),
      lastSentAt: new Date(),
      attemptCount: 0,
    });

    return { code, otp: await this.repo.save(otp) };
  }

  async enforceResendCooldown(userId: string, purpose: OtpPurpose) {
    const cooldownSec = Number(
      this.cfg.get<string>('OTP_RESEND_COOLDOWN_SEC') || '60',
    );
    const existing = await this.repo.findOne({
      where: { user: { id: userId }, purpose },
    });
    if (!existing?.lastSentAt) return;

    const deltaMs = Date.now() - new Date(existing.lastSentAt).getTime();
    if (deltaMs < cooldownSec * 1000) {
      throw new BadRequestException(
        `Please wait ${Math.ceil((cooldownSec * 1000 - deltaMs) / 1000)}s before resending.`,
      );
    }
  }

  async verify(
    userId: string,
    purpose: OtpPurpose,
    code: string,
  ): Promise<boolean> {
    const otp = await this.repo.findOne({
      where: { user: { id: userId }, purpose },
      select: ['id', 'codeHash', 'expiresAt', 'attemptCount'],
      relations: ['user'],
    });

    if (!otp) throw new BadRequestException('OTP not found.');
    if (otp.expiresAt.getTime() < Date.now())
      throw new BadRequestException('OTP expired.');

    const expected = Buffer.from(otp.codeHash, 'hex');
    const supplied = Buffer.from(this.hashCode(code), 'hex');
    const ok =
      expected.length === supplied.length &&
      crypto.timingSafeEqual(expected, supplied);

    if (!ok) {
      otp.attemptCount += 1;
      const maxAttempts = this.cfg.get<number>('OTP_MAX_ATTEMPTS') ?? 5;
      if (otp.attemptCount >= maxAttempts) {
        await this.repo.delete({ id: otp.id });
        throw new BadRequestException(
          'Too many invalid attempts. Request a new code.',
        );
      }
      await this.repo.save(otp);
      throw new BadRequestException('Invalid OTP.');
    }

    await this.repo.delete({ id: otp.id });
    return true;
  }
}
