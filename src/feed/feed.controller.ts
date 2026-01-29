import { Controller, Get, Query, Req } from '@nestjs/common';
import { FeedService } from './feed.service';

@Controller('feed')
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Get()
  getFeed(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    return this.feed.getFeed(req.user.id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      radiusKm: radiusKm ? Number(radiusKm) : 50,
    });
  }
}
