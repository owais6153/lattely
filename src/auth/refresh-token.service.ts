import { createHash, randomBytes } from 'crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { User } from '../users/user.entity';

import { RefreshToken } from './refresh-token.entity';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly tokens: Repository<RefreshToken>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  private hash(rawToken: string) {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private newRawToken() {
    return randomBytes(48).toString('base64url');
  }

  private expiresAt() {
    const days = this.config.get<number>('JWT_REFRESH_TTL_DAYS') ?? 30;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private async createForUser(user: User, manager?: EntityManager) {
    const rawToken = this.newRawToken();
    const repository = manager?.getRepository(RefreshToken) ?? this.tokens;
    await repository.save(
      repository.create({
        user,
        tokenHash: this.hash(rawToken),
        expiresAt: this.expiresAt(),
        revokedAt: null,
      }),
    );
    return rawToken;
  }

  issue(user: User) {
    return this.createForUser(user);
  }

  async rotate(rawToken: string) {
    const tokenHash = this.hash(rawToken);

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(RefreshToken);
      const current = await repository
        .createQueryBuilder('token')
        .leftJoinAndSelect('token.user', 'user')
        .addSelect('token.tokenHash')
        .where('token.tokenHash = :tokenHash', { tokenHash })
        .setLock('pessimistic_write')
        .getOne();

      if (!current || current.revokedAt || current.expiresAt <= new Date()) {
        throw new UnauthorizedException(
          'Refresh session is invalid or expired.',
        );
      }

      current.revokedAt = new Date();
      await repository.save(current);
      const refreshToken = await this.createForUser(current.user, manager);
      return { user: current.user, refreshToken };
    });
  }

  async revoke(rawToken: string) {
    const current = await this.tokens.findOne({
      where: { tokenHash: this.hash(rawToken) },
    });
    if (!current || current.revokedAt) return;
    current.revokedAt = new Date();
    await this.tokens.save(current);
  }

  async revokeAll(userId: string) {
    await this.tokens
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('userId = :userId', { userId })
      .andWhere('revokedAt IS NULL')
      .execute();
  }
}
