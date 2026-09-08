import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: Transporter;

  constructor(private readonly cfg: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.cfg.get<string>('MAIL_HOST'),
      port: Number(this.cfg.get<string>('MAIL_PORT')),
      secure: this.cfg.get<string>('MAIL_SECURE') === 'true',
      connectionTimeout: Number(
        this.cfg.get<string>('MAIL_CONNECTION_TIMEOUT_MS') || '10000',
      ),
      greetingTimeout: Number(
        this.cfg.get<string>('MAIL_GREETING_TIMEOUT_MS') || '10000',
      ),
      socketTimeout: Number(
        this.cfg.get<string>('MAIL_SOCKET_TIMEOUT_MS') || '20000',
      ),
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
