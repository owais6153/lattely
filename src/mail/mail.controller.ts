import { Body, Controller, NotFoundException, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../common/decorators/public.decorator';

import { TestEmailDto } from './mail.dto';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  @Public()
  @Post('test')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async sendTestEmail(@Body() body: TestEmailDto) {
    if (this.config.get<string>('APP_ENV') !== 'development') {
      throw new NotFoundException();
    }

    await this.mail.sendTestEmail(body.email.toLowerCase());
    return { message: `Test email sent to ${body.email.toLowerCase()}.` };
  }
}
