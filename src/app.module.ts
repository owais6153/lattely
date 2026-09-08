import { join } from 'path';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgoraModule } from './agora/agora.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guards';
import { ReelRequiredGuard } from './common/guards/reels-required.guard';
import { RolesGuard } from './common/guards/roles.guards';
import { validateEnvironment } from './config/env.validation';
import { FeedModule } from './feed/feed.module';
import { InteractionsModule } from './interactions/interactions.module';
import { MailModule } from './mail/mail.module';
import { ReelsModule } from './reels/reels.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),

    ScheduleModule.forRoot(),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => [
        {
          ttl: cfg.get<number>('THROTTLE_TTL_MS') ?? 60000,
          limit: cfg.get<number>('THROTTLE_LIMIT') ?? 120,
        },
      ],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'mysql',
        host: cfg.get<string>('DB_HOST'),
        port: Number(cfg.get<string>('DB_PORT')),
        username: cfg.get<string>('DB_USER'),
        password: cfg.get<string>('DB_PASS'),
        database: cfg.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: cfg.get<boolean>('DB_SYNCHRONIZE') ?? false,
        migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
        migrationsRun: cfg.get<boolean>('DB_RUN_MIGRATIONS') ?? false,
      }),
    }),

    MailModule,
    UsersModule,
    AuthModule,
    ReelsModule,
    InteractionsModule,
    FeedModule,
    AgoraModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ReelRequiredGuard },
  ],
})
export class AppModule {}
