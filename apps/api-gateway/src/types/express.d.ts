// Auth user populated by optionalAuthMiddleware / requireAuth (per ADR 002 DIY JWT).
export interface AuthUser {
  sub: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      // Set by requestIdMiddleware. Always populated in production paths;
      // optional only because middleware ordering theoretically allows a
      // handler to fire before it (we register it first so this is safe).
      id?: string;
    }
  }
}
