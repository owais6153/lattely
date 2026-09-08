import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InteractionRequest } from '../interactions/interaction.entity';

import { AgoraController } from './agora.controller';
import { AgoraService } from './agora.service';
import { PreDateCall } from './pre-date-call.entity';
import { PreDateCallService } from './pre-date-call.service';

@Module({
  imports: [TypeOrmModule.forFeature([PreDateCall, InteractionRequest])],
  controllers: [AgoraController],
  providers: [AgoraService, PreDateCallService],
})
export class AgoraModule {}
