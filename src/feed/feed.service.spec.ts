import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { Reel } from '../reels/reel.entity';
import { User } from '../users/user.entity';

import { FeedService } from './feed.service';

describe('FeedService cursor validation', () => {
  it('rejects a valid JSON cursor that is not an object', async () => {
    const queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
    };
    const reels = {
      createQueryBuilder: jest.fn(() => queryBuilder),
    } as unknown as Repository<Reel>;
    const users = {
      findOne: jest.fn().mockResolvedValue({
        id: 'viewer',
        gender: 'MALE',
        lat: 31.5,
        lng: 74.3,
        interestedGender: 'FEMALE',
        weekdaysAvailability: 'MORNING',
        weekendsAvailability: 'EVENING',
      }),
    } as unknown as Repository<User>;
    const service = new FeedService(reels, users);
    const nullCursor = Buffer.from('null').toString('base64url');

    await expect(
      service.getFeed('viewer', { cursor: nullCursor, limit: 20 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
