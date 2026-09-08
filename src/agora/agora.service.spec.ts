import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import { AgoraService } from './agora.service';

describe('AgoraService', () => {
  it('generates a short-lived AccessToken2 RTC token', () => {
    const values: Record<string, string> = {
      AGORA_APP_ID: '0123456789abcdef0123456789abcdef',
      AGORA_APP_CERT: 'abcdef0123456789abcdef0123456789',
      AGORA_TOKEN_TTL_SEC: '120',
    };
    const config = { get: jest.fn((name: string) => values[name]) };
    const service = new AgoraService(config as unknown as ConfigService);

    expect(service.generateRtcToken('date_request-id', 1234)).toMatch(/^007/);
  });

  it('does not generate a token without the private certificate', () => {
    const config = {
      get: jest.fn((name: string) =>
        name === 'AGORA_APP_ID'
          ? '0123456789abcdef0123456789abcdef'
          : undefined,
      ),
    };
    const service = new AgoraService(config as unknown as ConfigService);

    expect(() => service.generateRtcToken('date_request-id', 1234)).toThrow(
      BadRequestException,
    );
  });
});
