import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { Reel } from '../reels/reel.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reel, User])],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
