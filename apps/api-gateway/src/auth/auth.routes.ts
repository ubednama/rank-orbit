import { Router, Request, Response } from "express";

export const authRouter = Router();

// Auth is a no-op until phase 2 DIY JWT (per ADR 002 + handbook/03-system-design.md).
// This stub keeps the route mounted so the client can call it without 404s during the gap.
authRouter.get("/me", (_req: Request, res: Response) => {
  res.status(501).json({
    message: "Auth not yet implemented (anonymous-only until phase 2 DIY JWT lands)",
    user: null,
    authenticated: false,
  });
});
