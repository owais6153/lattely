import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PreDateCall } from '../agora/pre-date-call.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Reel } from '../reels/reel.entity';
import { User } from '../users/user.entity';

import { Cooldown } from './cooldown.entity';
import { GooglePlacesService } from './google-places.service';
import { InteractionRequest } from './interaction.entity';
import { InteractionsController } from './interactions.controller';
import { InteractionsService } from './interactions.service';
import { MeetupFeedback } from './meetup-feedback.entity';
import { SafetyReport } from './safety-report.entity';
import { UserBlock } from './user-block.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InteractionRequest,
      Reel,
      User,
      Cooldown,
      MeetupFeedback,
      SafetyReport,
      UserBlock,
      PreDateCall,
    ]),
    NotificationsModule,
  ],
  controllers: [InteractionsController],
  providers: [InteractionsService, GooglePlacesService],
})
export class InteractionsModule {}
