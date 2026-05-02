import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const baseSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  PAYMONGO_SECRET_KEY: z.string().default(""),
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
});

const parsed = baseSchema.parse(process.env);

const isProd = parsed.NODE_ENV === "production";

const jwtSecret = (label: string, value: string | undefined): string => {
  if (isProd) {
    if (!value || value.length < 32) {
      throw new Error(
        `${label} must be set to a string of at least 32 characters in production`,
      );
    }
    return value;
  }
  return value ?? `${label.toLowerCase()}-dev-fallback-do-not-use-in-prod`;
};

export const env = {
  ...parsed,
  JWT_ACCESS_SECRET: jwtSecret("JWT_ACCESS_SECRET", parsed.JWT_ACCESS_SECRET),
  JWT_REFRESH_SECRET: jwtSecret(
    "JWT_REFRESH_SECRET",
    parsed.JWT_REFRESH_SECRET,
  ),
} as const;
