import { Controller, Get, Query, Req } from '@nestjs/common';

import type { AuthenticatedRequest } from '../common/types/auth.types';

import { FeedService } from './feed.service';

@Controller('feed')
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Get()
  getFeed(
    @Req() req: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feed.getFeed(req.user.id, {
      cursor,
      limit: limit ? Number(limit) : 20,
    });
  }
}
