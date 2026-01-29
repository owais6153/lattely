import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InteractionRequest } from './interaction.entity';
import { InteractionProposal } from './proposal.entity';
import { InteractionsService } from './interactions.service';
import { InteractionsController } from './interactions.controller';
import { GooglePlacesService } from './google-places.service';
import { Reel } from '../reels/reel.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InteractionRequest,
      InteractionProposal,
      Reel,
      User,
    ]),
  ],
  controllers: [InteractionsController],
  providers: [InteractionsService, GooglePlacesService],
})
export class InteractionsModule {}
