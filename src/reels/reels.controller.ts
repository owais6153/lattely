import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import type { AuthenticatedRequest } from '../common/types/auth.types';

import { reelsMulterOptions } from './multer-reels.config';
import { UploadReelMetaDto } from './reels.dto';
import { ReelsService } from './reels.service';

@Controller('reels')
export class ReelsController {
  constructor(private readonly reels: ReelsService) {}

  @Get('me')
  getMine(@Req() req: AuthenticatedRequest) {
    return this.reels.getCurrentReel(req.user.id);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor(
      'video',
      reelsMulterOptions(Number(process.env.MAX_REEL_MB || '100')),
    ),
  )
  upload(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body() meta: UploadReelMetaDto,
  ) {
    return this.reels.uploadReel(req.user.id, file, meta);
  }

  @Put('me')
  @UseInterceptors(
    FileInterceptor(
      'video',
      reelsMulterOptions(Number(process.env.MAX_REEL_MB || '100')),
    ),
  )
  replace(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body() meta: UploadReelMetaDto,
  ) {
    return this.reels.replaceReel(req.user.id, file, meta);
  }

  @Delete('me')
  remove(@Req() req: AuthenticatedRequest) {
    return this.reels.deleteReel(req.user.id);
  }
}
