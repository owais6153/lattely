import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reel } from './reel.entity';
import { ReelsController } from './reels.controller';
import { ReelsService } from './reels.service';
import { UsersModule } from '../users/users.module';
import { InteractionRequest } from '../interactions/interaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reel, InteractionRequest]), UsersModule],
  controllers: [ReelsController],
  providers: [ReelsService],
  exports: [TypeOrmModule, ReelsService],
})
export class ReelsModule {}
