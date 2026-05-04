import { z } from "zod";

export const createReviewSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating max is 5"),
  comment: z.string().max(1000).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const REVIEWS_PAGE_SIZE = 10 as const;

export const listDoctorReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

export type ListDoctorReviewsQuery = z.infer<
  typeof listDoctorReviewsQuerySchema
>;
