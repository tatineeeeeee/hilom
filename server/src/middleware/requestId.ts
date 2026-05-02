import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

const HEADER = "x-request-id";
const MAX_LENGTH = 128;

export const requestId = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const incoming = req.header(HEADER);
  const id =
    typeof incoming === "string" &&
    incoming.length > 0 &&
    incoming.length <= MAX_LENGTH
      ? incoming
      : randomUUID();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
};
