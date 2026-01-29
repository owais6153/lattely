import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ReelsService } from './reels.service';
import { reelsMulterOptions } from './multer-reels.config';
import { UploadReelMetaDto } from './reels.dto';

@Controller('reels')
export class ReelsController {
  constructor(
    private readonly reels: ReelsService,
    private readonly cfg: ConfigService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor(
      'video',
      reelsMulterOptions(Number(process.env.MAX_REEL_MB || '6000')),
    ),
  )
  upload(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() meta: UploadReelMetaDto,
  ) {
    return this.reels.uploadReel(req.user.id, file, meta);
  }
}
