import jwt, { type SignOptions } from "jsonwebtoken";
import { randomUUID } from "crypto";
import { z } from "zod";
import { env } from "../config/env";

export type Role = "patient" | "doctor" | "admin";

export interface AccessPayload {
  sub: string;
  role: Role;
}

export interface RefreshPayload {
  sub: string;
}

const accessPayloadSchema = z.object({
  sub: z.string(),
  role: z.enum(["patient", "doctor", "admin"]),
});

const refreshPayloadSchema = z.object({
  sub: z.string(),
});

const ACCESS_TTL: SignOptions["expiresIn"] = "15m";
const REFRESH_TTL: SignOptions["expiresIn"] = "7d";

export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const signAccess = (payload: AccessPayload): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL });

export const signRefresh = (payload: RefreshPayload): string =>
  jwt.sign({ ...payload, jti: randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TTL,
  });

export const verifyAccess = (token: string): AccessPayload => {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  const parsed = accessPayloadSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new jwt.JsonWebTokenError("Malformed access token");
  }
  return parsed.data;
};

export const verifyRefresh = (token: string): RefreshPayload => {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  const parsed = refreshPayloadSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new jwt.JsonWebTokenError("Malformed refresh token");
  }
  return parsed.data;
};
