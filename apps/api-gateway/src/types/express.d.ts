// Auth user shape (placeholder until phase 2 DIY JWT lands per ADR 002).
export interface AuthUser {
  sub: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
