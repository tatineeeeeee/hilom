import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth.middleware";
import {
  authLimiter,
  forgotPasswordLimiter,
  refreshLimiter,
  resendVerificationLimiter,
  tokenConsumerLimiter,
} from "../middleware/rateLimit";
import {
  register,
  login,
  refresh,
  logout,
  me,
} from "../controllers/auth.controller";
import {
  verifyEmail,
  resendVerification,
} from "../controllers/emailVerification.controller";
import {
  requestPasswordReset,
  resetPassword,
} from "../controllers/passwordReset.controller";

export const authRouter: ExpressRouter = Router();

authRouter.post("/register", authLimiter, asyncHandler(register));
authRouter.post("/login", authLimiter, asyncHandler(login));
authRouter.post("/refresh", refreshLimiter, asyncHandler(refresh));
authRouter.post("/logout", requireAuth, asyncHandler(logout));
authRouter.get("/me", requireAuth, asyncHandler(me));

authRouter.get(
  "/verify-email",
  tokenConsumerLimiter,
  asyncHandler(verifyEmail),
);
authRouter.post(
  "/resend-verification",
  requireAuth,
  resendVerificationLimiter,
  asyncHandler(resendVerification),
);
authRouter.post(
  "/forgot-password",
  forgotPasswordLimiter,
  asyncHandler(requestPasswordReset),
);
authRouter.post(
  "/reset-password",
  tokenConsumerLimiter,
  asyncHandler(resetPassword),
);
