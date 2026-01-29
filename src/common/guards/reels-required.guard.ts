import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

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

    const req = ctx.switchToHttp().getRequest();

    const baseUrl = req.baseUrl || ''; // e.g. "/auth"
    const routePath = req.route?.path || ''; // e.g. "/login"
    const fullPath = `${baseUrl}${routePath}`;

    if (this.allowList.has(fullPath)) return true;

    const user = req.user as
      | { isEmailVerified?: boolean; reelUploaded?: boolean }
      | undefined;
    if (!user) return false;

    if (!user.isEmailVerified) return false;
    return !!user.reelUploaded;
  }
}
