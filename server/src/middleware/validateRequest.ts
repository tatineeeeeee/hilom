import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

type Target = "body" | "query" | "params";

export const validateRequest =
  (schema: ZodTypeAny, target: Target = "body"): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      next(result.error);
      return;
    }
    if (target === "body") {
      req.body = result.data;
    } else if (target === "query") {
      // Express 5 may freeze query; safest to just attach parsed copy
      Object.assign(req.query as object, result.data);
    } else {
      Object.assign(req.params as object, result.data);
    }
    next();
  };
