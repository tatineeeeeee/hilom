import rateLimit, { ipKeyGenerator, type Store } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { createClient } from "redis";
import { z } from "zod";
import type { Request } from "express";
import { env } from "../config/env";
import { logger } from "../config/logger";

type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;

const getRedisClient = (): RedisClient | null => {
  if (env.NODE_ENV !== "production") return null;
  if (!env.REDIS_URL) return null;
  if (redisClient) return redisClient;

  const client = createClient({ url: env.REDIS_URL });
  client.on("error", (err: Error) => {
    logger.error({ err }, "redis connection error");
  });
  void client.connect().catch((err: unknown) => {
    logger.error({ err }, "redis initial connect failed");
  });
  redisClient = client;
  return client;
};

const buildStore = (prefix: string): Store | undefined => {
  const client = getRedisClient();
  if (!client) return undefined;
  return new RedisStore({
    sendCommand: (...args: string[]) => client.sendCommand(args),
    prefix: `rl:${prefix}:`,
  });
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production",
  store: buildStore("auth"),
  message: {
    success: false,
    error: "Too many requests. Try again later.",
  },
});

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production",
  store: buildStore("refresh"),
  message: {
    success: false,
    error: "Too many refresh requests. Try again later.",
  },
});

export const tokenConsumerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production",
  store: buildStore("token-consume"),
  message: {
    success: false,
    error: "Too many requests. Try again later.",
  },
});

type KeyExtractor = (req: Request) => string | undefined;

const keyedLimiter = (
  prefix: string,
  maxPerHour: number,
  keyer: KeyExtractor,
) =>
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: maxPerHour,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV !== "production",
    store: buildStore(prefix),
    keyGenerator: (req) =>
      keyer(req) ?? (req.ip ? ipKeyGenerator(req.ip) : "unknown"),
    message: {
      success: false,
      error: "Too many requests. Try again later.",
    },
  });

const emailBodySchema = z.object({ email: z.string() });

export const forgotPasswordLimiter = keyedLimiter("forgot", 3, (req) => {
  const parsed = emailBodySchema.safeParse(req.body);
  return parsed.success ? parsed.data.email.toLowerCase() : undefined;
});

export const resendVerificationLimiter = keyedLimiter(
  "resend",
  3,
  (req) => req.user?.id,
);
