import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import crypto from 'crypto';

export function reelsMulterOptions(maxMb: number) {
  const maxBytes = maxMb * 1024 * 1024;

  return {
    storage: diskStorage({
      destination: (req, file, cb) => {
        cb(null, 'public/uploads/reels');
      },
      filename: (req, file, cb) => {
        const safeExt = extname(file.originalname).toLowerCase();
        const name = crypto.randomUUID();
        cb(null, `OSK-${name}${safeExt}`);
      },
    }),
    limits: {
      fileSize: maxBytes,
    },
    fileFilter: (req: any, file: any, cb: any) => {
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
          false,
        );
      }
      cb(null, true);
    },
  };
}
