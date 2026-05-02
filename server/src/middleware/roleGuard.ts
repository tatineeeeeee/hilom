import type { Request, Response, NextFunction, RequestHandler } from "express";
import { AppError } from "../utils/AppError";
import type { Role } from "../utils/jwt";

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "Authentication required"));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "Forbidden: insufficient role"));
    }
    next();
  };
