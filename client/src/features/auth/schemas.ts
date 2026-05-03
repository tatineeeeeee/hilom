import { z } from "zod";

const emailSchema = z.string().email("Enter a valid email").max(255);

const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(128)
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/\d/, "Must contain a number");

const phoneSchema = z
  .string()
  .min(7, "Phone is too short")
  .max(20)
  .regex(/^[+\d][\d\s-]*$/, "Invalid phone format");

const optionalPhone = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  phoneSchema.optional(),
);

const baseRegisterSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password"),
  fullName: z.string().min(1, "Full name is required").max(255).trim(),
  phone: optionalPhone,
});

export const registerPatientSchema = baseRegisterSchema
  .extend({ role: z.literal("patient") })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const registerDoctorSchema = baseRegisterSchema
  .extend({ role: z.literal("doctor") })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;
export type RegisterDoctorInput = z.infer<typeof registerDoctorSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
