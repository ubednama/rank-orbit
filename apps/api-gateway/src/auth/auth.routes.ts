import { Router, Request, Response, CookieOptions } from "express";
import { ZodError } from "zod";
import {
  AuthService,
  AuthError,
  AuthResult,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_TTL_MS,
} from "./auth.service";
import { LoginSchema } from "./dto/login.dto";
import { SignUpSchema } from "./dto/signup.dto";
import { requireAuth } from "../middleware/auth.middleware";
import { logger } from "../logger";

export const authRouter = Router();
const authService = new AuthService();

const isProd = process.env.NODE_ENV === "production";

/**
 * HttpOnly cookie carrying the refresh token. Path-scoped so it's only
 * sent to /auth/* routes — keeps it off every audit/health/etc request.
 */
function refreshCookieOpts(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd, // dev (http://localhost) needs secure: false
    sameSite: isProd ? "strict" : "lax",
    path: "/api/auth",
    maxAge: REFRESH_COOKIE_TTL_MS,
  };
}

function clientMeta(req: Request) {
  return {
    userAgent: req.headers["user-agent"] ?? null,
    ip: req.ip ?? req.socket.remoteAddress ?? null,
  };
}

/** Send the AuthResult to the client: refresh token in cookie, the rest in body. */
function sendAuthResult(res: Response, result: AuthResult, status = 200): void {
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOpts());
  res.status(status).json({
    user: result.user,
    accessToken: result.accessToken,
    expiresAt: result.expiresAt,
  });
}

function handleAuthError(res: Response, err: unknown): void {
  if (err instanceof AuthError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      message: "Invalid request",
      issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }
  const msg = err instanceof Error ? err.message : String(err);
  logger.error(`Auth handler error: ${msg}`);
  res.status(500).json({ message: "Internal server error" });
}

authRouter.post("/signup", async (req: Request, res: Response) => {
  try {
    const dto = SignUpSchema.parse(req.body);
    const result = await authService.signup(dto, clientMeta(req));
    sendAuthResult(res, result, 201);
  } catch (err) {
    handleAuthError(res, err);
  }
});

authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const dto = LoginSchema.parse(req.body);
    const result = await authService.login(dto, clientMeta(req));
    sendAuthResult(res, result, 200);
  } catch (err) {
    handleAuthError(res, err);
  }
});

authRouter.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await authService.getById(req.user!.sub);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(user);
  } catch (err) {
    handleAuthError(res, err);
  }
});

/**
 * Rotate the refresh token. Reads the cookie, issues a new access token + new
 * refresh token, revokes the old one. On token-reuse the entire chain is
 * revoked (handled inside auth.service).
 */
authRouter.post("/refresh", async (req: Request, res: Response) => {
  try {
    const cookieToken: string | undefined = req.cookies?.[REFRESH_COOKIE_NAME];
    const result = await authService.refresh(cookieToken ?? "", clientMeta(req));
    sendAuthResult(res, result, 200);
  } catch (err) {
    // Clear the (now invalid) cookie so the client doesn't loop on /refresh
    if (err instanceof AuthError && err.status === 401) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: refreshCookieOpts().path });
    }
    handleAuthError(res, err);
  }
});

/**
 * Logout: revoke the refresh token in DB and clear the cookie. Always 204
 * regardless of whether the token was valid (idempotent, no information leak).
 */
authRouter.post("/logout", async (req: Request, res: Response) => {
  try {
    const cookieToken: string | undefined = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logout(cookieToken);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: refreshCookieOpts().path });
    res.status(204).end();
  } catch (err) {
    handleAuthError(res, err);
  }
});
