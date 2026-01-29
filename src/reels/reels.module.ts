import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reel } from './reel.entity';
import { ReelsController } from './reels.controller';
import { ReelsService } from './reels.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Reel]), UsersModule],
  controllers: [ReelsController],
  providers: [ReelsService],
  exports: [TypeOrmModule, ReelsService],
})
export class ReelsModule {}
