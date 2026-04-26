import { Router } from "express";
import { authRouter } from "../auth/auth.routes";
import { auditRouter } from "../audit/audit.routes";

export const routes = Router();

routes.use("/auth", authRouter);
routes.use("/audit", auditRouter);
