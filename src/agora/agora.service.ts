import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token'; // npm package agora-access-token :contentReference[oaicite:0]{index=0}

@Injectable()
export class AgoraService {
  constructor(private readonly cfg: ConfigService) {}

  generateRtcToken(channelName: string, uid: number) {
    const appId = this.cfg.get<string>('AGORA_APP_ID');
    const appCert = this.cfg.get<string>('AGORA_APP_CERT');
    const ttl = Number(this.cfg.get<string>('AGORA_TOKEN_TTL_SEC') || '3600');

    if (!appId || !appCert)
      throw new BadRequestException('Agora credentials missing.');

    const now = Math.floor(Date.now() / 1000);
    const expireTs = now + ttl;

    // role publisher is common for 1:1 call (both publish audio/video)
    return RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCert,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      expireTs,
    );
  }
}
