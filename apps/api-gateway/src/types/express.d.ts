// Auth user populated by optionalAuthMiddleware / requireAuth (per ADR 002 DIY JWT).
export interface AuthUser {
  sub: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
