import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { assertAdultBirthDate } from './age-rules';
import { User } from './user.entity';
import type {
  UpdateLocationDto,
  UpdatePreferencesDto,
  UpdateProfileDto,
} from './users.dto';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  role: true,
  isEmailVerified: true,
  reelUploaded: true,
  permissionsCompleted: true,
  gender: true,
  firstName: true,
  lastName: true,
  birthDate: true,
  address: true,
  lat: true,
  lng: true,
  city: true,
  country: true,
  interestedGender: true,
  weekdaysAvailability: true,
  weekendsAvailability: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  async findByEmail(email: string) {
    return this.repo.findOne({
      where: { email },
      select: SAFE_USER_SELECT,
    });
  }

  async findById(id: string) {
    return this.repo.findOne({
      where: { id },
      select: SAFE_USER_SELECT,
    });
  }

  // For login only (needs passwordHash)
  async findForAuthByEmail(email: string) {
    return this.repo.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        isEmailVerified: true,
        reelUploaded: true,
      },
    });
  }

  async createUser(data: Partial<User>) {
    const u = this.repo.create(data);
    const saved = await this.repo.save(u);
    const safeUser = await this.findById(saved.id);
    if (!safeUser) throw new BadRequestException('Unable to create user.');
    return safeUser;
  }

  async markEmailVerified(userId: string) {
    await this.repo.update({ id: userId }, { isEmailVerified: true });
    return this.findById(userId);
  }

  async markReelUploaded(userId: string, reelUploaded = true) {
    await this.repo.update({ id: userId }, { reelUploaded });
    return this.findById(userId);
  }

  async markPermissionsCompleted(userId: string) {
    await this.repo.update({ id: userId }, { permissionsCompleted: true });
    return this.findById(userId);
  }

  async updateBirthDate(userId: string, birthDate: string) {
    assertAdultBirthDate(birthDate);
    const user = await this.findById(userId);
    if (!user) throw new BadRequestException('User not found.');
    if (user.birthDate) {
      throw new BadRequestException('Date of birth is already confirmed.');
    }
    await this.repo.update({ id: userId }, { birthDate });
    return this.findById(userId);
  }

  async findForAccountDeletion(id: string) {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.reel', 'reel')
      .where('user.id = :id', { id })
      .getOne();
  }

  async deleteById(id: string) {
    await this.repo.delete({ id });
  }

  async updatePasswordHash(userId: string, passwordHash: string) {
    await this.repo.update({ id: userId }, { passwordHash });
  }
  async updateLocation(userId: string, dto: UpdateLocationDto) {
    const address = dto.address.trim();
    if (!address) throw new BadRequestException('Address is required.');
    await this.repo.update(
      { id: userId },
      {
        address,
        lat: dto.lat,
        lng: dto.lng,
        city: dto.city?.trim() ?? null,
        country: dto.country?.trim() ?? null,
      },
    );
    return this.findById(userId);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    if (!firstName || !lastName)
      throw new BadRequestException('First and last name are required.');
    await this.repo.update(
      { id: userId },
      { firstName, lastName, gender: dto.gender },
    );
    return this.findById(userId);
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
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
