import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/user.entity';

import { PushToken } from './push-token.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(PushToken) private readonly repo: Repository<PushToken>,
  ) {}

  async register(userId: string, token: string, platform: 'ios' | 'android') {
    const existing = await this.repo.findOne({
      where: { token },
      relations: ['user'],
    });
    await this.repo.save(
      this.repo.create({
        ...existing,
        token,
        platform,
        user: { id: userId } as User,
      }),
    );
    return { message: 'Push token registered.' };
  }

  async remove(userId: string, token: string) {
    await this.repo.delete({ token, user: { id: userId } });
    return { message: 'Push token removed.' };
  }

  async send(userId: string, title: string, body: string, url: string) {
    const tokens = await this.repo.find({ where: { user: { id: userId } } });
    if (!tokens.length) return;
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          tokens.map(({ token }) => ({
            to: token,
            sound: 'default',
            title,
            body,
            data: { url },
          })),
        ),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok)
        this.logger.warn(`Expo push service returned ${response.status}.`);
    } catch (error) {
      this.logger.warn(
        `Push delivery failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
