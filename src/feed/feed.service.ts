import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reel } from '../reels/reel.entity';
import { User, Gender } from '../users/user.entity';

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Reel) private readonly reelsRepo: Repository<Reel>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  private oppositeGender(gender: Gender): Gender[] {
    if (gender === Gender.MALE) return [Gender.FEMALE];
    if (gender === Gender.FEMALE) return [Gender.MALE];
    // If user is OTHER, show MALE + FEMALE for now (you can change this rule later)
    return [Gender.FEMALE, Gender.MALE];
  }

  async getFeed(
    userId: string,
    opts: { page: number; limit: number; radiusKm: number },
  ) {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: ['id', 'gender', 'lat', 'lng'] as any,
    });

    if (!user) throw new BadRequestException('User not found.');
    if (user.lat == null || user.lng == null) {
      throw new BadRequestException('User location is missing.');
    }

    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(Math.max(1, opts.limit || 20), 50);
    const radiusKm = Math.min(Math.max(1, opts.radiusKm || 50), 200); // clamp for safety
    const skip = (page - 1) * limit;

    const allowedGenders = this.oppositeGender(user.gender);

    const qb = this.reelsRepo
      .createQueryBuilder('reel')
      .leftJoin('reel.user', 'u')
      .addSelect(['u.id', 'u.firstName', 'u.gender'] as any)
      .where('u.id != :userId', { userId })
      .andWhere('u.gender IN (:...genders)', { genders: allowedGenders })
      .andWhere(
        `ST_Distance_Sphere(
          POINT(reel.lng, reel.lat),
          POINT(:lng, :lat)
        ) <= :meters`,
        {
          lat: user.lat,
          lng: user.lng,
          meters: radiusKm * 1000,
        },
      )
      .orderBy('reel.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const items = await qb.getMany();

    return {
      page,
      limit,
      radiusKm,
      count: items.length,
      items: items.map((r: any) => ({
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
