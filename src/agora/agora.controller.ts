import { Controller, Get, Param, Post, Req } from '@nestjs/common';

import type { AuthenticatedRequest } from '../common/types/auth.types';

import { PreDateCallService } from './pre-date-call.service';

@Controller('requests/:requestId/call')
export class AgoraController {
  constructor(private readonly calls: PreDateCallService) {}

  @Get('token')
  token(
    @Req() request: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    return this.calls.getToken(request.user.id, requestId);
  }

  @Post('start')
  start(
    @Req() request: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    return this.calls.markStarted(request.user.id, requestId);
  }

  @Post('complete')
  complete(
    @Req() request: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    return this.calls.markCompleted(request.user.id, requestId);
  }
}
