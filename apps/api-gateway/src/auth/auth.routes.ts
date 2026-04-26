import { Router, Request, Response } from "express";
import { ZodError } from "zod";
import { AuthService, AuthError } from "./auth.service";
import { LoginSchema } from "./dto/login.dto";
import { SignUpSchema } from "./dto/signup.dto";
import { requireAuth } from "../middleware/auth.middleware";
import { logger } from "../logger";

export const authRouter = Router();
const authService = new AuthService();

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
    const result = await authService.signup(dto);
    res.status(201).json(result);
  } catch (err) {
    handleAuthError(res, err);
  }
});

authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const dto = LoginSchema.parse(req.body);
    const result = await authService.login(dto);
    res.status(200).json(result);
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

// Phase 1 logout is stateless: the client just discards the token. Server returns 204.
// Server-side blacklist + refresh-token revocation lands in phase 2.
authRouter.post("/logout", (_req: Request, res: Response) => {
  res.status(204).end();
});
