import { db, users, eq } from "@db";
import { hash, verify } from "@node-rs/argon2";
import jwt from "jsonwebtoken";
import { LoginDto } from "./dto/login.dto";
import { SignUpDto } from "./dto/signup.dto";
import { enqueueWelcomeEmail } from "../emails/notifications.worker";
import { logger } from "../logger";

const APP_URL = process.env.APP_URL || "http://localhost:5000";

// Phase 1 per handbook/03-system-design.md: access token only, 30-min TTL.
// Refresh tokens land in phase 2 (HttpOnly cookie).
const ACCESS_TOKEN_TTL_SECONDS = 30 * 60;

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

export class AuthService {
  async signup(dto: SignUpDto): Promise<AuthResult> {
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

    // Welcome email — fire and forget; failure is non-fatal for signup.
    enqueueWelcomeEmail({ to: created.email, appUrl: APP_URL }).catch((err) => {
      logger.warn(`Failed to enqueue welcome email for ${created.email}: ${err.message}`);
    });

    return {
      user: { id: created.id, email: created.email },
      accessToken: token,
      expiresAt,
    };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
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
    return {
      user: { id: user.id, email: user.email },
      accessToken: token,
      expiresAt,
    };
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
