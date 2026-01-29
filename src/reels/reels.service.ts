import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reel } from './reel.entity';
import { UsersService } from '../users/users.service';
import { getVideoDurationSec } from './video-metadata';
import { unlink } from 'fs/promises';
import { UploadReelMetaDto } from './reels.dto';

@Injectable()
export class ReelsService {
  constructor(
    @InjectRepository(Reel) private readonly repo: Repository<Reel>,
    private readonly users: UsersService,
  ) {}

  private async safeDelete(path?: string) {
    if (!path) return;
    try {
      await unlink(path);
    } catch {
      // ignore
    }
  }

  async uploadReel(
    userId: string,
    file: Express.Multer.File,
    meta: UploadReelMetaDto,
  ) {
    if (!file) throw new BadRequestException('Video file is required.');

    const user = await this.users.findById(userId);
    if (!user) {
      await this.safeDelete(file.path);
      throw new BadRequestException('User not found.');
    }

    if (!user.isEmailVerified) {
      await this.safeDelete(file.path);
      throw new BadRequestException('Verify email first.');
    }

    const existing = await this.repo.findOne({
      where: { user: { id: userId } } as any,
      relations: ['user'],
    });
    if (existing) {
      await this.safeDelete(file.path);
      throw new BadRequestException('You already uploaded a reel.');
    }

    // True duration from video file
    let durationSec = 0;
    try {
      durationSec = await getVideoDurationSec(file.path);
    } catch {
      await this.safeDelete(file.path);
      throw new BadRequestException(
        'Unable to read video duration. Please upload a valid video file.',
      );
    }

    // Enforce 30s to 60s
    if (durationSec < 5 || durationSec > 60) {
      await this.safeDelete(file.path);
      throw new BadRequestException(
        'Reel duration must be between 5 and 60 seconds.',
      );
    }

    // Build public URL
    const videoUrl = `public/uploads/reels/${file.filename}`;

    // If user didn’t provide location at signup, allow setting during upload
    // (Only update if provided)
    const lat = meta.lat ?? user.lat ?? null;
    const lng = meta.lng ?? user.lng ?? null;

    // Save reel
    const reel = this.repo.create({
      user: user as any,
      videoUrl,
      durationSec,
      lat,
      lng,
    });

    await this.repo.save(reel);

    // Mark user reelUploaded = true
    const updatedUser = await this.users.markReelUploaded(userId);

    return {
      message: 'Reel uploaded.',
      user: updatedUser,
      reel: {
        id: reel.id,
        videoUrl: reel.videoUrl,
        durationSec: reel.durationSec,
        createdAt: reel.createdAt,
      },
    };
  }
}
