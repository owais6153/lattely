import { Body, Controller, Delete, Post, Req } from '@nestjs/common';

import type { AuthenticatedRequest } from '../common/types/auth.types';

import { RegisterPushTokenDto } from './notifications.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('push-token')
  register(
    @Req() req: AuthenticatedRequest,
    @Body() body: RegisterPushTokenDto,
  ) {
    return this.notifications.register(req.user.id, body.token, body.platform);
  }

  @Delete('push-token')
  remove(@Req() req: AuthenticatedRequest, @Body() body: RegisterPushTokenDto) {
    return this.notifications.remove(req.user.id, body.token);
  }
}
