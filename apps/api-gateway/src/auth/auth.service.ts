import { db, users, refreshTokens, eq, and, isNull } from "@db";
import { hash, verify } from "@node-rs/argon2";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { LoginDto } from "./dto/login.dto";
import { SignUpDto } from "./dto/signup.dto";
import { enqueueWelcomeEmail } from "../emails/notifications.worker";
import { logger } from "../logger";

const APP_URL = process.env.APP_URL || "http://localhost:5000";

// Phase 2 of ADR 002: access (15min) + refresh (30 days) tokens.
// Phase 1's 30-min access token was simplification; once refresh exists, the
// access token can be shorter because the client auto-refreshes silently.
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

// argon2id parameters per ADR 002. ~64MB memory, time cost 3, parallelism 1.
const ARGON2_OPTS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};

export interface AccessTokenPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
  type: "access";
}

export interface AuthResult {
  user: { id: string; email: string };
  accessToken: string;
  expiresAt: number;
  /** Raw refresh token (NOT hashed). Caller is responsible for setting it as an HttpOnly cookie. */
  refreshToken: string;
  refreshExpiresAt: Date;
}

export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters");
  }
  return secret;
}

function signAccessToken(userId: string, email: string): { token: string; expiresAt: number } {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + ACCESS_TOKEN_TTL_SECONDS;
  const payload: AccessTokenPayload = {
    sub: userId,
    email,
    iat: now,
    exp: expiresAt,
    type: "access",
  };
  const token = jwt.sign(payload, getJwtSecret(), { algorithm: "HS256" });
  return { token, expiresAt };
}

/** Generate a high-entropy refresh token and its SHA-256 hash. */
function generateRefreshToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(64).toString("hex"); // 128 hex chars
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash: tokenHash };
}

function hashRefreshToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

interface IssueRefreshArgs {
  userId: string;
  userAgent?: string | null;
  ip?: string | null;
  /** When rotating: the previous refresh token's row id, so we can link replacedBy. */
  replacingTokenId?: string;
}

async function issueRefreshToken(
  args: IssueRefreshArgs,
): Promise<{ raw: string; expiresAt: Date; id: string }> {
  const { raw, hash: tokenHash } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  const [inserted] = await db
    .insert(refreshTokens)
    .values({
      userId: args.userId,
      tokenHash,
      expiresAt,
      userAgent: args.userAgent ?? null,
      ip: args.ip ?? null,
    })
    .returning({ id: refreshTokens.id });

  // Link the rotation chain
  if (args.replacingTokenId) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date(), replacedBy: inserted.id })
      .where(eq(refreshTokens.id, args.replacingTokenId));
  }

  return { raw, expiresAt, id: inserted.id };
}

export interface ClientMeta {
  userAgent?: string | null;
  ip?: string | null;
}

export class AuthService {
  async signup(dto: SignUpDto, meta: ClientMeta = {}): Promise<AuthResult> {
    const existing = await db.select().from(users).where(eq(users.email, dto.email)).limit(1);
    if (existing.length > 0) {
      throw new AuthError(409, "An account with this email already exists");
    }

    const passwordHash = await hash(dto.password, ARGON2_OPTS);
    const [created] = await db
      .insert(users)
      .values({ email: dto.email, passwordHash })
      .returning({ id: users.id, email: users.email });

    const { token, expiresAt } = signAccessToken(created.id, created.email);
    const refresh = await issueRefreshToken({
      userId: created.id,
      userAgent: meta.userAgent,
      ip: meta.ip,
    });

    enqueueWelcomeEmail({ to: created.email, appUrl: APP_URL }).catch((err) => {
      logger.warn(`Failed to enqueue welcome email for ${created.email}: ${err.message}`);
    });

    return {
      user: { id: created.id, email: created.email },
      accessToken: token,
      expiresAt,
      refreshToken: refresh.raw,
      refreshExpiresAt: refresh.expiresAt,
    };
  }

  async login(dto: LoginDto, meta: ClientMeta = {}): Promise<AuthResult> {
    const [user] = await db.select().from(users).where(eq(users.email, dto.email)).limit(1);
    // Constant-time-ish: still run verify on a dummy hash if user is missing,
    // so the attacker can't time-distinguish "no such email" from "wrong password".
    if (!user) {
      await verify(
        "$argon2id$v=19$m=65536,t=3,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        dto.password,
      ).catch(() => false);
      throw new AuthError(401, "Invalid email or password");
    }

    const valid = await verify(user.passwordHash, dto.password).catch(() => false);
    if (!valid) {
      throw new AuthError(401, "Invalid email or password");
    }

    const { token, expiresAt } = signAccessToken(user.id, user.email);
    const refresh = await issueRefreshToken({
      userId: user.id,
      userAgent: meta.userAgent,
      ip: meta.ip,
    });

    return {
      user: { id: user.id, email: user.email },
      accessToken: token,
      expiresAt,
      refreshToken: refresh.raw,
      refreshExpiresAt: refresh.expiresAt,
    };
  }

  /**
   * Verify a presented refresh token and rotate it. On success, the old token
   * is revoked and a new access + refresh pair is issued.
   *
   * If the presented token is found but already revoked, that's a strong
   * compromise signal — revoke the entire token chain for that user.
   */
  async refresh(rawToken: string, meta: ClientMeta = {}): Promise<AuthResult> {
    if (!rawToken) throw new AuthError(401, "Missing refresh token");
    const tokenHash = hashRefreshToken(rawToken);

    const [row] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);
    if (!row) throw new AuthError(401, "Invalid refresh token");

    // Token reuse after revocation = compromise. Revoke the chain.
    if (row.revokedAt) {
      logger.warn(`Refresh token reuse detected for user ${row.userId}; revoking all tokens`);
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.userId, row.userId), isNull(refreshTokens.revokedAt)));
      throw new AuthError(401, "Session invalidated. Please sign in again.");
    }

    if (row.expiresAt.getTime() < Date.now()) {
      throw new AuthError(401, "Refresh token expired");
    }

    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, row.userId))
      .limit(1);
    if (!user) throw new AuthError(401, "User no longer exists");

    const { token: accessToken, expiresAt } = signAccessToken(user.id, user.email);
    const newRefresh = await issueRefreshToken({
      userId: user.id,
      userAgent: meta.userAgent,
      ip: meta.ip,
      replacingTokenId: row.id,
    });

    return {
      user,
      accessToken,
      expiresAt,
      refreshToken: newRefresh.raw,
      refreshExpiresAt: newRefresh.expiresAt,
    };
  }

  /**
   * Logout: revoke the presented refresh token. Idempotent — if the token is
   * already revoked or unknown, we still 204 so a stale client can clean up
   * without leaking which tokens exist.
   */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const tokenHash = hashRefreshToken(rawToken);
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)));
  }

  async getById(userId: string): Promise<{ id: string; email: string; createdAt: Date } | null> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return null;
    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
      if (typeof decoded === "string" || decoded.type !== "access") {
        throw new AuthError(401, "Invalid token");
      }
      return decoded as AccessTokenPayload;
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError(401, "Invalid or expired token");
    }
  }
}

export const REFRESH_COOKIE_NAME = "rank_orbit_refresh";
export const REFRESH_COOKIE_TTL_MS = REFRESH_TOKEN_TTL_SECONDS * 1000;
