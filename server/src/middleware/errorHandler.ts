import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

interface ErrorBody {
  success: false;
  error: string;
  details?: unknown;
}

const isPgUniqueViolation = (err: unknown): boolean => {
  if (typeof err !== "object" || err === null) return false;
  if (!("code" in err)) return false;
  return err.code === "23505";
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let status = 500;
  let body: ErrorBody = { success: false, error: "Internal Server Error" };

  if (err instanceof AppError) {
    status = err.statusCode;
    body = { success: false, error: err.message };
    if (err.details !== undefined) body.details = err.details;
  } else if (err instanceof ZodError) {
    status = 400;
    body = {
      success: false,
      error: "Validation failed",
      details: { fieldErrors: err.flatten().fieldErrors },
    };
  } else if (
    err instanceof jwt.TokenExpiredError ||
    err instanceof jwt.JsonWebTokenError
  ) {
    status = 401;
    body = { success: false, error: "Invalid or expired token" };
  } else if (isPgUniqueViolation(err)) {
    status = 409;
    body = { success: false, error: "Resource already exists" };
  } else if (env.NODE_ENV !== "production") {
    body = { success: false, error: err.message || "Internal Server Error" };
  }

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json(body);
};
