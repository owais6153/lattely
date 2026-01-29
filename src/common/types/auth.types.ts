export type Role = 'USER' | 'ADMIN';

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};
