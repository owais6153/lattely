import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RtcRole, RtcTokenBuilder } from 'agora-token';

@Injectable()
export class AgoraService {
  constructor(private readonly cfg: ConfigService) {}

  getAppId(): string {
    const appId = this.cfg.get<string>('AGORA_APP_ID');
    if (!appId) throw new BadRequestException('Agora credentials missing.');
    return appId;
  }

  generateRtcToken(channelName: string, uid: number, ttlSeconds?: number) {
    const appId = this.getAppId();
    const appCert = this.cfg.get<string>('AGORA_APP_CERT');
    const configuredTtl = Number(
      this.cfg.get<string>('AGORA_TOKEN_TTL_SEC') || '65',
    );
    const ttl = Math.max(
      1,
      Math.min(ttlSeconds ?? configuredTtl, configuredTtl),
    );

    if (!appCert) throw new BadRequestException('Agora credentials missing.');

    return RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCert,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      ttl,
      ttl,
    );
  }
}
