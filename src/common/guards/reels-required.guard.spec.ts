import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import { ReelRequiredGuard } from './reels-required.guard';

describe('ReelRequiredGuard onboarding routes', () => {
  const reflector = { getAllAndOverride: jest.fn(() => false) } as unknown as Reflector;
  const guard = new ReelRequiredGuard(reflector);

  function context(
    isEmailVerified: boolean,
    reelUploaded = false,
    role = 'USER',
  ) {
    const request = {
      baseUrl: '',
      route: { path: '/users/location' },
      user: { isEmailVerified, reelUploaded, role },
    };
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  it('allows a verified user to set location before uploading a vibe', () => {
    expect(guard.canActivate(context(true))).toBe(true);
  });

  it('keeps pre-reel onboarding unavailable until email is verified', () => {
    expect(guard.canActivate(context(false))).toBe(false);
  });

  it('allows administrators to use moderation without a vibe', () => {
    expect(guard.canActivate(context(true, false, 'ADMIN'))).toBe(true);
  });
});
