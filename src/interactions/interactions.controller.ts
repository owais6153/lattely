import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { InteractionsService } from './interactions.service';
import { CreateDateRequestDto, RespondDto } from './interactions.dto';

@Controller()
export class InteractionsController {
  constructor(private readonly interactions: InteractionsService) {}

  @Post('reels/:reelId/react/date')
  createDate(
    @Req() req: any,
    @Param('reelId') reelId: string,
    @Body() body: CreateDateRequestDto,
  ) {
    return this.interactions.createDateRequest(
      req.user.id,
      reelId,
      body.proposedStartAt,
      body.durationSec,
    );
  }

  @Get('requests/inbox')
  inbox(@Req() req: any) {
    return this.interactions.listInbox(req.user.id);
  }

  @Get('requests/outbox')
  outbox(@Req() req: any) {
    return this.interactions.listOutbox(req.user.id);
  }

  @Get('requests/:id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.interactions.getRequest(req.user.id, id);
  }

  @Post('requests/:id/respond')
  respond(@Req() req: any, @Param('id') id: string, @Body() body: RespondDto) {
    return this.interactions.respond(req.user.id, id, body);
  }
}
