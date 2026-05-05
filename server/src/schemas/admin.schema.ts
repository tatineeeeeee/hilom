import { z } from "zod";

export const ADMIN_PAGE_SIZE = 20 as const;

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  role: z.enum(["patient", "doctor", "admin"]).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const listUnverifiedDoctorsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

export type ListUnverifiedDoctorsQuery = z.infer<
  typeof listUnverifiedDoctorsQuerySchema
>;

export const verifyDoctorBodySchema = z.object({
  isVerified: z.boolean(),
});

export type VerifyDoctorBody = z.infer<typeof verifyDoctorBodySchema>;
