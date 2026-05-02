import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateRequest } from "../middleware/validateRequest";
import { requireAuth } from "../middleware/auth.middleware";
import { authLimiter } from "../middleware/rateLimit";
import { registerSchema, loginSchema } from "../schemas/auth.schema";
import {
  register,
  login,
  refresh,
  logout,
  me,
} from "../controllers/auth.controller";

export const authRouter: ExpressRouter = Router();

authRouter.post(
  "/register",
  authLimiter,
  validateRequest(registerSchema),
  asyncHandler(register),
);

authRouter.post(
  "/login",
  authLimiter,
  validateRequest(loginSchema),
  asyncHandler(login),
);

authRouter.post("/refresh", asyncHandler(refresh));

authRouter.post("/logout", requireAuth, asyncHandler(logout));

authRouter.get("/me", requireAuth, asyncHandler(me));
