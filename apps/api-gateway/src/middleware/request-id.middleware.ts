import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

/**
 * Tag every request with a unique id so logs, error responses, and (later)
 * downstream service calls can be correlated.
 *
 * - Trusts an inbound `X-Request-Id` header if present (when we sit behind
 *   another proxy that already issues one), otherwise mints a fresh UUID.
 * - Echoes the id back as `X-Request-Id` so the client/curl can quote it
 *   when reporting an error.
 *
 * The sanitizing global error handler reads `req.id` to surface the id to
 * the client without exposing internals.
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const inbound = req.headers["x-request-id"];
  // Accept inbound only if it looks sane — short, printable, single value.
  // (Defensive: an attacker-controlled id would otherwise pollute logs.)
  let id: string;
  if (typeof inbound === "string" && /^[A-Za-z0-9._-]{1,64}$/.test(inbound)) {
    id = inbound;
  } else {
    id = crypto.randomUUID();
  }

  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
};
