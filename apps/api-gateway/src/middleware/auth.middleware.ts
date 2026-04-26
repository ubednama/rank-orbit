import { Request, Response, NextFunction } from "express";
import { AuthService, AuthError } from "../auth/auth.service";

const authService = new AuthService();

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

/**
 * Populates req.user if a valid Bearer token is present; otherwise leaves it undefined.
 * Never rejects — callers decide whether anonymous access is allowed.
 */
export const optionalAuthMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const token = extractBearer(req);
  if (!token) {
    next();
    return;
  }
  try {
    const payload = authService.verifyAccessToken(token);
    req.user = { sub: payload.sub, email: payload.email };
  } catch {
    // Invalid/expired token on an optional route: treat as anonymous, do not 401.
  }
  next();
};

/**
 * Requires a valid Bearer token. Returns 401 if missing or invalid.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  try {
    const payload = authService.verifyAccessToken(token);
    req.user = { sub: payload.sub, email: payload.email };
    next();
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 401;
    const message = err instanceof Error ? err.message : "Invalid token";
    res.status(status).json({ message });
  }
};
