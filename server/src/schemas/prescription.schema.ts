import { z } from "zod";

export const medicationInputSchema = z.object({
  medicationName: z.string().trim().min(1).max(255),
  dosage: z.string().trim().min(1).max(100),
  frequency: z.string().trim().min(1).max(100),
  duration: z.string().trim().min(1).max(100),
  instructions: z.string().trim().max(2000).optional(),
});

export const writePrescriptionSchema = z.object({
  notes: z.string().trim().max(4000).optional(),
  medications: z
    .array(medicationInputSchema)
    .min(1, "At least one medication required")
    .max(20),
});

export type WritePrescriptionInput = z.infer<typeof writePrescriptionSchema>;
export type MedicationInput = z.infer<typeof medicationInputSchema>;
