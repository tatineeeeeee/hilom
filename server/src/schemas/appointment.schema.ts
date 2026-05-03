import { z } from "zod";

export const bookAppointmentSchema = z.object({
  doctorId: z.string().uuid("Invalid doctor ID"),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  slotStart: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm format"),
  slotEnd: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm format"),
  reason: z.string().max(500).optional(),
});

export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;

export const listAppointmentsQuerySchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  page: z.coerce.number().int().positive().default(1),
});

export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;

export const APPOINTMENT_PAGE_SIZE = 10;
