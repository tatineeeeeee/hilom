import type { Request, Response, NextFunction, RequestHandler } from "express";
import { AppError } from "../utils/AppError";
import { verifyAccess } from "../utils/jwt";

export const requireAuth: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError(401, "Missing or malformed Authorization header"));
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return next(new AppError(401, "Missing access token"));
  }
  try {
    const payload = verifyAccess(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
};
