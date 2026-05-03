import { z } from "zod";

export const doctorFiltersSchema = z.object({
  search: z.string().optional(),
  specializationId: z.array(z.number()).optional(),
  maxFee: z.number().optional(),
  minRating: z.number().optional(),
  sort: z.enum(["rating", "fee", "name"]).optional().default("rating"),
  page: z.number().int().positive().optional().default(1),
});

export type DoctorFilters = z.infer<typeof doctorFiltersSchema>;

export interface PublicDoctor {
  id: string;
  userId: string;
  specializationId: number;
  specializationName: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  yearsOfExperience: number;
  consultationFee: string;
  clinicAddress: string | null;
  slotDurationMinutes: number;
  isVerified: boolean;
  averageRating: string | null;
}

export interface DoctorsResponse {
  doctors: PublicDoctor[];
  total: number;
  page: number;
  pageSize: number;
}
