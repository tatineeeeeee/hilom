import { z } from "zod";

const stringArray = z.preprocess((val) => {
  if (Array.isArray(val)) return val;
  if (val === undefined || val === null || val === "") return undefined;
  return [val];
}, z.array(z.string()).optional());

const numericIdArray = z.preprocess((val) => {
  if (Array.isArray(val)) return val;
  if (val === undefined || val === null || val === "") return undefined;
  return [val];
}, z.array(z.coerce.number().int().positive()).optional());

export const sortValues = ["rating", "fee", "name"] as const;

export const listDoctorsQuerySchema = z.object({
  specializationId: numericIdArray,
  search: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().min(1).max(100).optional(),
  ),
  maxFee: z.coerce.number().nonnegative().max(99_999_999).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(sortValues).optional().default("rating"),
  page: z.coerce.number().int().positive().optional().default(1),
});

export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>;

export const DOCTOR_PAGE_SIZE = 20;

// stringArray is currently unused; keep for potential future filters.
void stringArray;
