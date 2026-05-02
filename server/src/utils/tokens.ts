import { createHash, randomBytes } from "crypto";

export const generateOpaqueToken = (): string =>
  randomBytes(32).toString("base64url");

export const hashOpaqueToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");
