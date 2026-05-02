import rateLimit from "express-rate-limit";
import type { Request } from "express";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    error: "Too many requests. Try again later.",
  },
});

type KeyExtractor = (req: Request) => string | undefined;

const keyedLimiter = (maxPerHour: number, keyer: KeyExtractor) =>
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: maxPerHour,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    keyGenerator: (req) => keyer(req) ?? req.ip ?? "unknown",
    message: {
      success: false,
      error: "Too many requests. Try again later.",
    },
  });

export const forgotPasswordLimiter = keyedLimiter(3, (req) => {
  const body: unknown = req.body;
  if (typeof body !== "object" || body === null || !("email" in body)) {
    return undefined;
  }
  const email = body.email;
  return typeof email === "string" ? email.toLowerCase() : undefined;
});

export const resendVerificationLimiter = keyedLimiter(3, (req) => req.user?.id);
