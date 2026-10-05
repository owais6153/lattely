import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../common/types/auth.types';

import {
  CreateDateRequestDto,
  FeedbackDto,
  ModerateReportDto,
  PostCallDecisionDto,
  RespondDto,
  SafetyReportDto,
  SelectTimeSlotDto,
} from './interactions.dto';
import { InteractionsService } from './interactions.service';

@Controller()
export class InteractionsController {
  constructor(private readonly interactions: InteractionsService) {}

  @Post('reels/:reelId/react/coffee')
  createCoffee(
    @Req() req: AuthenticatedRequest,
    @Param('reelId') reelId: string,
    @Body() body: CreateDateRequestDto,
  ) {
    return this.interactions.createCoffeeRequest(
      req.user.id,
      reelId,
      body.proposedStartTimes,
      body.timeZone,
    );
  }

  @Patch('requests/:id/time')
  selectTime(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: SelectTimeSlotDto,
  ) {
    return this.interactions.selectTimeSlot(
      req.user.id,
      id,
      body.selectedTimeSlotId,
    );
  }

  @Get('requests/inbox')
  inbox(@Req() req: AuthenticatedRequest) {
    return this.interactions.listInbox(req.user.id);
  }

  @Get('requests/outbox')
  outbox(@Req() req: AuthenticatedRequest) {
    return this.interactions.listOutbox(req.user.id);
  }

  @Get('meetups')
  meetups(@Req() req: AuthenticatedRequest) {
    return this.interactions.listMeetups(req.user.id);
  }

  @Get('meetups/:id/photo')
  meetupPhoto(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.interactions.getMeetupRestaurantPhoto(req.user.id, id);
  }

  @Get('requests/:id')
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.interactions.getRequest(req.user.id, id);
  }

  @Post('requests/:id/respond')
  respond(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: RespondDto,
  ) {
    return this.interactions.respond(req.user.id, id, body.action);
  }

  @Post('requests/:id/decision')
  decide(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: PostCallDecisionDto,
  ) {
    return this.interactions.decide(req.user.id, id, body.decision);
  }

  @Post('requests/:id/cancel')
  cancel(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.interactions.cancelMeetup(req.user.id, id);
  }

  @Post('requests/:id/feedback')
  feedback(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: FeedbackDto,
  ) {
    return this.interactions.submitFeedback(req.user.id, id, body);
  }

  @Post('safety/block/:userId')
  block(@Req() req: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.interactions.block(req.user.id, userId);
  }

  @Post('safety/report/:userId')
  report(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() body: SafetyReportDto,
  ) {
    return this.interactions.report(req.user.id, userId, body);
  }

  @Get('safety/reports')
  @Roles('ADMIN')
  reports() {
    return this.interactions.listReports();
  }

  @Patch('safety/reports/:id')
  @Roles('ADMIN')
  moderate(@Param('id') id: string, @Body() body: ModerateReportDto) {
    return this.interactions.moderateReport(id, body.status);
  }
}
