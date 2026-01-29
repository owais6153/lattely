import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { ReelsModule } from './reels/reels.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guards';
import { RolesGuard } from './common/guards/roles.guards';
import { ReelRequiredGuard } from './common/guards/reels-required.guard';
import { InteractionsModule } from './interactions/interactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

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
        synchronize: true, // dev only
      }),
    }),

    MailModule,
    UsersModule,
    AuthModule,
    ReelsModule,
    InteractionsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ReelRequiredGuard },
  ],
})
export class AppModule {}
