import { unlink } from 'fs/promises';
import { resolve, sep } from 'path';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { InteractionRequest } from '../interactions/interaction.entity';
import { UsersService } from '../users/users.service';

import { Reel } from './reel.entity';
import { UploadReelMetaDto } from './reels.dto';
import {
  getFfprobePath,
  getVideoDurationSec,
  verifyFfprobeAvailable,
} from './video-metadata';

const REEL_STORAGE_ROOT = resolve('public/uploads/reels');

@Injectable()
export class ReelsService implements OnModuleInit {
  private readonly logger = new Logger(ReelsService.name);

  constructor(
    @InjectRepository(Reel) private readonly repo: Repository<Reel>,
    @InjectRepository(InteractionRequest)
    private readonly requestsRepo: Repository<InteractionRequest>,
    private readonly users: UsersService,
  ) {}

  async onModuleInit() {
    try {
      await verifyFfprobeAvailable();
    } catch {
      this.logger.warn(
        `ffprobe is unavailable at "${getFfprobePath()}". Reel uploads will fail until FFPROBE_PATH or PATH is configured.`,
      );
    }
  }

  private async safeDelete(path?: string) {
    if (!path) return;
    const filePath = resolve(path);
    if (!filePath.startsWith(`${REEL_STORAGE_ROOT}${sep}`)) return;
    try {
      // The resolved path is constrained to REEL_STORAGE_ROOT above.
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await unlink(filePath);
    } catch {
      // ignore
    }
  }

  private storedFilePath(videoUrl: string) {
    const filePath = resolve(videoUrl);
    if (!filePath.startsWith(`${REEL_STORAGE_ROOT}${sep}`)) {
      throw new BadRequestException('Invalid stored reel path.');
    }
    return filePath;
  }

  private reelResponse(reel: Reel) {
    return {
      id: reel.id,
      videoUrl: reel.videoUrl,
      durationSec: reel.durationSec,
      createdAt: reel.createdAt,
    };
  }

  private async inspectVideo(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Video file is required.');

    let durationSec = 0;
    try {
      durationSec = await getVideoDurationSec(file.path);
    } catch {
      await this.safeDelete(file.path);
      throw new BadRequestException(
        'Unable to read video duration. Please upload a valid video file.',
      );
    }

    if (durationSec < 5 || durationSec > 60) {
      await this.safeDelete(file.path);
      throw new BadRequestException(
        'Reel duration must be between 5 and 60 seconds.',
      );
    }
    return durationSec;
  }

  async getCurrentReel(userId: string) {
    const reel = await this.repo.findOne({
      where: { user: { id: userId } },
    });
    if (!reel) throw new NotFoundException('You do not have a reel.');
    return this.reelResponse(reel);
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
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (existing) {
      await this.safeDelete(file.path);
      throw new BadRequestException('You already uploaded a reel.');
    }

    const durationSec = await this.inspectVideo(file);

    // Build public URL
    const videoUrl = `public/uploads/reels/${file.filename}`;

    // If user didn’t provide location at signup, allow setting during upload
    // (Only update if provided)
    const lat = meta.lat ?? user.lat ?? null;
    const lng = meta.lng ?? user.lng ?? null;

    // Save reel
    const reel = this.repo.create({
      user,
      videoUrl,
      durationSec,
      lat,
      lng,
    });

    try {
      await this.repo.save(reel);
    } catch (error) {
      await this.safeDelete(file.path);
      throw error;
    }

    // Mark user reelUploaded = true
    const updatedUser = await this.users.markReelUploaded(userId);

    return {
      message: 'Reel uploaded.',
      user: updatedUser,
      reel: this.reelResponse(reel),
    };
  }

  async replaceReel(
    userId: string,
    file: Express.Multer.File,
    meta: UploadReelMetaDto,
  ) {
    if (!file) throw new BadRequestException('Video file is required.');

    const reel = await this.repo.findOne({
      where: { user: { id: userId } },
    });
    if (!reel) {
      await this.safeDelete(file.path);
      throw new NotFoundException('Upload a reel before replacing it.');
    }

    const previousFilePath = this.storedFilePath(reel.videoUrl);
    const durationSec = await this.inspectVideo(file);
    const previous = {
      videoUrl: reel.videoUrl,
      durationSec: reel.durationSec,
      lat: reel.lat,
      lng: reel.lng,
    };

    reel.videoUrl = `public/uploads/reels/${file.filename}`;
    reel.durationSec = durationSec;
    reel.lat = meta.lat ?? reel.lat;
    reel.lng = meta.lng ?? reel.lng;

    try {
      await this.repo.save(reel);
    } catch (error) {
      Object.assign(reel, previous);
      await this.safeDelete(file.path);
      throw error;
    }

    await this.safeDelete(previousFilePath);
    const user = await this.users.findById(userId);
    return {
      message: 'Reel replaced.',
      user,
      reel: this.reelResponse(reel),
    };
  }

  async deleteReel(userId: string) {
    const reel = await this.repo.findOne({
      where: { user: { id: userId } },
    });
    if (!reel) throw new NotFoundException('You do not have a reel.');

    const requestCount = await this.requestsRepo.count({
      where: { reel: { id: reel.id } },
    });
    if (requestCount > 0) {
      throw new ConflictException(
        'This reel is linked to date requests and cannot be deleted. You can replace it instead.',
      );
    }

    const filePath = this.storedFilePath(reel.videoUrl);
    await this.users.markReelUploaded(userId, false);
    try {
      await this.repo.remove(reel);
    } catch (error) {
      await this.users.markReelUploaded(userId, true);
      throw error;
    }
    const user = await this.users.findById(userId);
    await this.safeDelete(filePath);

    return { message: 'Reel deleted.', user };
  }
}
