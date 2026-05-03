import type { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import {
  bookAppointmentSchema,
  listAppointmentsQuerySchema,
} from "../schemas/appointment.schema";
import { z } from "zod";
import {
  bookAppointment as bookAppointmentService,
  listPatientAppointments,
  listDoctorAppointments,
  updateAppointmentStatus as updateStatusService,
} from "../services/appointment.service";

export const bookAppointment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");
  if (req.user.role !== "patient") {
    throw new AppError(403, "Only patients can book appointments");
  }

  const parsed = bookAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid booking payload", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const appointment = await bookAppointmentService(req.user.id, parsed.data);
  res.status(201).json({ success: true, data: { appointment } });
};

export const listMyAppointments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");
  if (req.user.role !== "patient") {
    throw new AppError(403, "Only patients can view their appointments");
  }

  const parsed = listAppointmentsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Invalid query parameters", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const result = await listPatientAppointments(req.user.id, parsed.data);
  res.json({ success: true, data: result });
};

export const listMyDoctorAppointments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");
  if (req.user.role !== "doctor") {
    throw new AppError(403, "Only doctors can view their appointments");
  }

  const parsed = listAppointmentsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Invalid query parameters", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const result = await listDoctorAppointments(req.user.id, parsed.data);
  res.json({ success: true, data: result });
};

const updateStatusSchema = z.object({
  status: z.enum(["confirmed", "completed", "cancelled"]),
});

export const updateStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");

  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid status", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const appointment = await updateStatusService(
    req.params.id ?? "",
    parsed.data.status,
    req.user,
  );
  res.json({ success: true, data: { appointment } });
};
