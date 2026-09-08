import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthenticatedRequest } from '../types/auth.types';

@Injectable()
export class ReelRequiredGuard implements CanActivate {
  // Full paths (controller prefix + route path)
  private readonly allowList = new Set<string>([
    '/auth/register',
    '/auth/login',
    '/auth/resend-otp',
    '/auth/verify-email',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/me',
    '/auth/account',
  ]);

  private readonly verifiedOnboardingRoutes = new Set<string>([
    '/users/location',
    '/users/profile',
    '/users/preferences',
    '/users/permissions',
    '/notifications/push-token',
    '/reels/upload',
  ]);

  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    // If route is public, skip guard
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    const baseUrl = req.baseUrl || ''; // e.g. "/auth"
    const rawRoute: unknown = req.route;
    const route =
      typeof rawRoute === 'object' && rawRoute !== null
        ? (rawRoute as Record<string, unknown>)
        : undefined;
    const routePath = route && typeof route.path === 'string' ? route.path : ''; // e.g. "/login"
    const fullPath = `${baseUrl}${routePath}`;

    if (this.allowList.has(fullPath)) return true;

    const user = req.user;
    if (!user) return false;

    if (this.verifiedOnboardingRoutes.has(fullPath)) {
      return user.isEmailVerified;
    }

    if (!user.isEmailVerified) return false;
    return !!user.reelUploaded;
  }
}
