import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

const SAFE_USER_SELECT = [
  'id',
  'email',
  'role',
  'isEmailVerified',
  'reelUploaded',
  'gender',
  'firstName',
  'lastName',
  'address',
  'lat',
  'lng',
  'city',
  'country',
  'createdAt',
  'updatedAt',
] as const;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  async findByEmail(email: string) {
    return this.repo.findOne({
      where: { email },
      select: SAFE_USER_SELECT as any,
    });
  }

  async findById(id: string) {
    return this.repo.findOne({
      where: { id },
      select: SAFE_USER_SELECT as any,
    });
  }

  // For login only (needs passwordHash)
  async findForAuthByEmail(email: string) {
    return this.repo.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'passwordHash',
        'role',
        'isEmailVerified',
        'reelUploaded',
      ] as any,
    });
  }

  async createUser(data: Partial<User>) {
    const u = this.repo.create(data);
    const saved = await this.repo.save(u);
    return this.findById(saved.id);
  }

  async markEmailVerified(userId: string) {
    await this.repo.update({ id: userId }, { isEmailVerified: true });
    return this.findById(userId);
  }

  async markReelUploaded(userId: string) {
    await this.repo.update({ id: userId }, { reelUploaded: true });
    return this.findById(userId);
  }

  async updatePasswordHash(userId: string, passwordHash: string) {
    await this.repo.update({ id: userId }, { passwordHash });
  }
  async updateLocation(userId: string, dto: any) {
    await this.repo.update(
      { id: userId },
      {
        address: dto.address.trim(),
        lat: dto.lat,
        lng: dto.lng,
        city: dto.city?.trim() ?? null,
        country: dto.country?.trim() ?? null,
      },
    );
    return this.findById(userId);
  }

  async updatePreferences(userId: string, dto: any) {
    await this.repo.update(
      { id: userId },
      {
        interestedGender: dto.interestedGender,
        weekdaysAvailability: dto.weekdaysAvailability,
        weekendsAvailability: dto.weekendsAvailability,
      },
    );
    return this.findById(userId);
  }

  async requireOnboardingReadyForFeed(userId: string) {
    const u = await this.repo.findOne({ where: { id: userId } });
    if (!u) throw new BadRequestException('User not found.');
    if (!u.isEmailVerified)
      throw new BadRequestException('Verify email first.');
    if (!u.address || u.lat == null || u.lng == null)
      throw new BadRequestException('Location is required.');
    if (
      !u.interestedGender ||
      !u.weekdaysAvailability ||
      !u.weekendsAvailability
    ) {
      throw new BadRequestException('Preferences are required.');
    }
    if (!u.reelUploaded) throw new BadRequestException('Upload reel first.');
    return u;
  }
}
