import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Reel } from '../reels/reel.entity';
import { User } from '../users/user.entity';

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Reel) private readonly reelsRepo: Repository<Reel>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  private allowedGenders(interested: string): string[] {
    if (interested === 'DOESNT_MATTER') return ['MALE', 'FEMALE', 'NON_BINARY'];
    return [interested];
  }

  async getFeed(userId: string, opts: { cursor?: string; limit: number }) {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: {
        id: true,
        gender: true,
        lat: true,
        lng: true,
        interestedGender: true,
        weekdaysAvailability: true,
        weekendsAvailability: true,
      },
    });

    if (!user) throw new BadRequestException('User not found.');
    if (user.lat == null || user.lng == null)
      throw new BadRequestException('Location missing.');
    if (
      !user.interestedGender ||
      !user.weekdaysAvailability ||
      !user.weekendsAvailability
    ) {
      throw new BadRequestException('Preferences missing.');
    }

    const limit = Math.min(Math.max(1, opts.limit || 20), 50);
    if (opts.cursor && opts.cursor.length > 500)
      throw new BadRequestException('Invalid feed cursor.');
    const radiusKm = 16.0934;
    const latDelta = radiusKm / 111.32;
    const lngDelta =
      radiusKm /
      (111.32 * Math.max(Math.cos((user.lat * Math.PI) / 180), 0.01));

    const genders = this.allowedGenders(user.interestedGender);

    const qb = this.reelsRepo
      .createQueryBuilder('reel')
      .leftJoin('reel.user', 'u')
      .addSelect([
        'u.id',
        'u.firstName',
        'u.lastName',
        'u.gender',
        'u.weekdaysAvailability',
        'u.weekendsAvailability',
      ])
      .where('u.id != :userId', { userId })
      .andWhere('u.gender IN (:...genders)', { genders })
      .andWhere(
        '(u.interestedGender = :viewerGender OR u.interestedGender = :anyGender)',
        { viewerGender: user.gender, anyGender: 'DOESNT_MATTER' },
      )
      .andWhere('u.lat BETWEEN :minLat AND :maxLat', {
        minLat: user.lat - latDelta,
        maxLat: user.lat + latDelta,
      })
      .andWhere('u.lng BETWEEN :minLng AND :maxLng', {
        minLng: user.lng - lngDelta,
        maxLng: user.lng + lngDelta,
      })
      .andWhere(
        `NOT EXISTS (
        SELECT 1 FROM cooldowns c
        WHERE c.expiresAt > NOW() AND
          ((c.userAId = :userId AND c.userBId = u.id) OR (c.userBId = :userId AND c.userAId = u.id))
      )`,
      )
      .andWhere(
        `NOT EXISTS (
        SELECT 1 FROM user_blocks b
        WHERE (b.blockerId = :userId AND b.blockedId = u.id)
           OR (b.blockedId = :userId AND b.blockerId = u.id)
      )`,
      )
      .andWhere(
        `ST_Distance_Sphere(
          POINT(u.lng, u.lat),
          POINT(:lng, :lat)
        ) <= :meters`,
        { lat: user.lat, lng: user.lng, meters: radiusKm * 1000 },
      )
      .orderBy('reel.createdAt', 'DESC')
      .addOrderBy('reel.id', 'DESC')
      .take(limit + 1);

    if (opts.cursor) {
      let decoded: { createdAt: string; id: string };
      try {
        decoded = JSON.parse(
          Buffer.from(opts.cursor, 'base64url').toString('utf8'),
        ) as typeof decoded;
      } catch {
        throw new BadRequestException('Invalid feed cursor.');
      }
      const createdAt = new Date(decoded.createdAt);
      if (!decoded.id || Number.isNaN(createdAt.getTime()))
        throw new BadRequestException('Invalid feed cursor.');
      qb.andWhere(
        '(reel.createdAt < :cursorDate OR (reel.createdAt = :cursorDate AND reel.id < :cursorId))',
        {
          cursorDate: createdAt,
          cursorId: decoded.id,
        },
      );
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    const last = items.at(-1);

    return {
      limit,
      radiusKm,
      count: items.length,
      nextCursor:
        hasMore && last
          ? Buffer.from(
              JSON.stringify({
                createdAt: last.createdAt.toISOString(),
                id: last.id,
              }),
            ).toString('base64url')
          : null,
      items: items.map((r) => ({
        reelId: r.id,
        videoUrl: r.videoUrl,
        durationSec: r.durationSec,
        createdAt: r.createdAt,
        user: {
          id: r.user?.id,
          firstName: r.user?.firstName,
          lastName: r.user?.lastName,
          gender: r.user?.gender,
        },
      })),
    };
  }
}
