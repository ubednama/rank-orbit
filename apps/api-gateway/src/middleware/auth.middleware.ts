import { Request, Response, NextFunction } from "express";

/**
 * No-op middleware until DIY JWT lands in phase 2 (per ADR 002).
 * Clerk was removed during the v2 rebuild; anonymous-only access for now.
 */
export const optionalAuthMiddleware = async (
  _req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  next();
};
