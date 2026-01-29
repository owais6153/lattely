import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly cfg: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.cfg.get<string>('MAIL_HOST'),
      port: Number(this.cfg.get<string>('MAIL_PORT')),
      secure: this.cfg.get<string>('MAIL_SECURE') === 'true',
      auth: {
        user: this.cfg.get<string>('MAIL_USER'),
        pass: this.cfg.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendOtpEmail(
    to: string,
    purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD',
    code: string,
  ) {
    const appName = this.cfg.get<string>('APP_NAME') || 'App';
    const subject =
      purpose === 'VERIFY_EMAIL'
        ? `${appName} Email Verification Code`
        : `${appName} Password Reset Code`;

    const text =
      purpose === 'VERIFY_EMAIL'
        ? `Your verification code is: ${code}\nThis code expires soon.`
        : `Your password reset code is: ${code}\nThis code expires soon.`;

    await this.transporter.sendMail({
      from: this.cfg.get<string>('MAIL_FROM'),
      to,
      subject,
      text,
    });
  }
}
