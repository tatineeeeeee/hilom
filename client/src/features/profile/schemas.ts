import { z } from "zod";

export const bloodTypeValues = [
  "A+",
  "A-",
  "B+",
  "B-",
  "O+",
  "O-",
  "AB+",
  "AB-",
] as const;

export const bloodTypeSchema = z.enum(bloodTypeValues);

const optionalText = (max: number) =>
  z.preprocess(
    (val) =>
      val === "" || val === null || val === undefined ? undefined : val,
    z.string().max(max).optional(),
  );

const optionalDate = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
);

const optionalEmergencyPhone = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z
    .string()
    .min(7, "Phone is too short")
    .max(20)
    .regex(/^[+\d][\d\s-]*$/, "Invalid phone format")
    .optional(),
);

const optionalBloodType = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  bloodTypeSchema.optional(),
);

export const patientProfileSchema = z.object({
  dateOfBirth: optionalDate,
  bloodType: optionalBloodType,
  allergies: optionalText(2000),
  emergencyContactName: optionalText(255),
  emergencyContactPhone: optionalEmergencyPhone,
});

export const slotDurationValues = [15, 30, 60] as const;

const slotDurationSchema = z.union([
  z.literal(15),
  z.literal(30),
  z.literal(60),
]);

export const doctorProfileSchema = z.object({
  specializationId: z.coerce.number().int().positive("Pick a specialization"),
  bio: z.string().min(1, "Bio is required").max(2000),
  yearsOfExperience: z.coerce
    .number()
    .int()
    .min(0, "Cannot be negative")
    .max(80, "That's a lot of years"),
  consultationFee: z.coerce
    .number()
    .nonnegative("Fee must be 0 or more")
    .max(99_999_999),
  clinicAddress: optionalText(500),
  slotDurationMinutes: slotDurationSchema.optional(),
});

export const isSlotDuration = (n: number): n is 15 | 30 | 60 =>
  n === 15 || n === 30 || n === 60;

export const isBloodType = (s: string): s is (typeof bloodTypeValues)[number] =>
  (bloodTypeValues as readonly string[]).includes(s);

export type PatientProfileInput = z.infer<typeof patientProfileSchema>;
export type DoctorProfileInput = z.infer<typeof doctorProfileSchema>;

export interface PatientProfile {
  id: string;
  userId: string;
  dateOfBirth: string | null;
  bloodType: string | null;
  allergies: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  specializationId: number;
  bio: string | null;
  yearsOfExperience: number;
  consultationFee: string;
  clinicAddress: string | null;
  slotDurationMinutes: number;
  isVerified: boolean;
  averageRating: string | null;
}

export const isDoctorProfile = (
  profile: PatientProfile | DoctorProfile | null | undefined,
): profile is DoctorProfile =>
  profile !== null && profile !== undefined && "specializationId" in profile;

export const isPatientProfile = (
  profile: PatientProfile | DoctorProfile | null | undefined,
): profile is PatientProfile =>
  profile !== null && profile !== undefined && !("specializationId" in profile);
