import type { Request } from 'express';

export type Role = 'USER' | 'ADMIN';

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: Role;
  isEmailVerified: boolean;
  reelUploaded: boolean;
  gender: string;
  firstName: string;
  lastName: string;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
  route?: { path?: string };
};
