import type { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { createReviewSchema } from "../schemas/review.schema";
import { createReview as createReviewService } from "../services/review.service";

export const createReview = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");
  if (req.user.role !== "patient") {
    throw new AppError(403, "Only patients can submit reviews");
  }

  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid review payload", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const review = await createReviewService(
    req.user.id,
    req.params.id ?? "",
    parsed.data,
  );
  res.status(201).json({ success: true, data: { review } });
};
