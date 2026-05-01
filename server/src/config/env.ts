import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1).default("hilom-access-secret-dev"),
  JWT_REFRESH_SECRET: z.string().min(1).default("hilom-refresh-secret-dev"),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  PAYMONGO_SECRET_KEY: z.string().default(""),
});

export const env = envSchema.parse(process.env);
