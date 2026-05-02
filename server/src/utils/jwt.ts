import jwt, { type SignOptions } from "jsonwebtoken";
import { createHash } from "crypto";
import { env } from "../config/env";

export type Role = "patient" | "doctor" | "admin";

export interface AccessPayload {
  sub: string;
  role: Role;
}

export interface RefreshPayload {
  sub: string;
}

const ACCESS_TTL: SignOptions["expiresIn"] = "15m";
const REFRESH_TTL: SignOptions["expiresIn"] = "7d";

export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const signAccess = (payload: AccessPayload): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL });

export const signRefresh = (payload: RefreshPayload): string =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL });

export const verifyAccess = (token: string): AccessPayload => {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded === "string" || !decoded.sub || !("role" in decoded)) {
    throw new jwt.JsonWebTokenError("Malformed access token");
  }
  return { sub: String(decoded.sub), role: decoded.role as Role };
};

export const verifyRefresh = (token: string): RefreshPayload => {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  if (typeof decoded === "string" || !decoded.sub) {
    throw new jwt.JsonWebTokenError("Malformed refresh token");
  }
  return { sub: String(decoded.sub) };
};

export const hashRefresh = (token: string): string =>
  createHash("sha256").update(token).digest("hex");
