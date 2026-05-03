import { z } from "zod";

export const slotDurationSchema = z.union([
  z.literal(15),
  z.literal(30),
  z.literal(60),
]);

export const bloodTypeSchema = z.enum([
  "A+",
  "A-",
  "B+",
  "B-",
  "O+",
  "O-",
  "AB+",
  "AB-",
]);

const optionalString = (max: number) =>
  z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().max(max).optional(),
  );

const optionalDateString = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
);

const optionalEmergencyPhone = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z
    .string()
    .min(7)
    .max(20)
    .regex(/^[+\d][\d\s-]*$/, "Invalid phone format")
    .optional(),
);

export const patientProfileUpdateSchema = z.object({
  role: z.literal("patient"),
  dateOfBirth: optionalDateString,
  bloodType: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    bloodTypeSchema.optional(),
  ),
  allergies: optionalString(2000),
  emergencyContactName: optionalString(255),
  emergencyContactPhone: optionalEmergencyPhone,
});

export const doctorProfileUpdateSchema = z.object({
  role: z.literal("doctor"),
  specializationId: z.coerce.number().int().positive(),
  bio: z.string().min(1).max(2000),
  yearsOfExperience: z.coerce.number().int().min(0).max(80),
  consultationFee: z.coerce.number().nonnegative().max(99_999_999),
  clinicAddress: optionalString(500),
  slotDurationMinutes: slotDurationSchema.optional(),
});

export const profileUpdateSchema = z.discriminatedUnion("role", [
  patientProfileUpdateSchema,
  doctorProfileUpdateSchema,
]);

export type PatientProfileUpdateInput = z.infer<
  typeof patientProfileUpdateSchema
>;
export type DoctorProfileUpdateInput = z.infer<
  typeof doctorProfileUpdateSchema
>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
