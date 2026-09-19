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
  birthDate: string | null;
  reelUploaded: boolean;
  gender: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
  route?: { path?: string };
};
