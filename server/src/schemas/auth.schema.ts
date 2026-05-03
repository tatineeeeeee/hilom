import { z } from "zod";

const phoneSchema = z
  .string()
  .min(7)
  .max(20)
  .regex(/^[+\d][\d\s-]*$/, "Invalid phone format");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/\d/, "Must contain a number");

const baseRegisterSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: passwordSchema,
  fullName: z.string().min(1).max(255).trim(),
  phone: phoneSchema.optional(),
});

export const registerPatientSchema = baseRegisterSchema.extend({
  role: z.literal("patient"),
});

export const registerDoctorSchema = baseRegisterSchema.extend({
  role: z.literal("doctor"),
});

export const registerSchema = z.discriminatedUnion("role", [
  registerPatientSchema,
  registerDoctorSchema,
]);

export const loginSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(1).max(128),
});

export const verifyEmailQuerySchema = z.object({
  token: z.string().min(1).max(255),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(255),
  newPassword: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
