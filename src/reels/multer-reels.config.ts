import crypto from 'crypto';
import { mkdirSync } from 'fs';
import { resolve } from 'path';

import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import type { FileFilterCallback } from 'multer';

const REEL_UPLOAD_DIRECTORY = resolve('public/uploads/reels');

export function reelsMulterOptions(maxMb: number): MulterOptions {
  const maxBytes = maxMb * 1024 * 1024;

  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        try {
          mkdirSync(REEL_UPLOAD_DIRECTORY, { recursive: true });
          cb(null, REEL_UPLOAD_DIRECTORY);
        } catch (error) {
          cb(error as Error, REEL_UPLOAD_DIRECTORY);
        }
      },
      filename: (req, file, cb) => {
        const safeExt =
          (
            {
              'video/mp4': '.mp4',
              'video/quicktime': '.mov',
              'video/webm': '.webm',
            } as Record<string, string>
          )[file.mimetype] ?? '.mp4';
        const name = crypto.randomUUID();
        cb(null, `OSK-${name}${safeExt}`);
      },
    }),
    limits: {
      fileSize: maxBytes,
    },
    fileFilter: (
      _req: Request,
      file: Express.Multer.File,
      cb: FileFilterCallback,
    ) => {
      const allowedMime = new Set([
        'video/mp4',
        'video/quicktime', // .mov
        'video/webm',
      ]);

      if (!allowedMime.has(file.mimetype)) {
        return cb(
          new BadRequestException(
            'Invalid video format. Allowed: mp4, mov, webm.',
          ),
        );
      }
      cb(null, true);
    },
  };
}
