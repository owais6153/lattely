import { Injectable } from '@nestjs/common';
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
}
