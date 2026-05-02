import type { CookieOptions, Response } from "express";
import { env } from "../config/env";
import { REFRESH_TTL_MS } from "./jwt";

export const REFRESH_COOKIE_NAME = "refresh_token";

const isProd = env.NODE_ENV === "production";

const refreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "strict",
  path: "/api/auth",
  maxAge: REFRESH_TTL_MS,
});

export const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions());
};

export const clearRefreshCookie = (res: Response): void => {
  const opts = refreshCookieOptions();
  delete opts.maxAge;
  res.clearCookie(REFRESH_COOKIE_NAME, opts);
};
