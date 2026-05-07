import type { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { writePrescriptionSchema } from "../schemas/prescription.schema";
import {
  writePrescription as writePrescriptionService,
  getPrescriptionByAppointment,
  listMyPrescriptions as listMyPrescriptionsService,
} from "../services/prescription.service";

export const writePrescription = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");
  if (req.user.role !== "doctor") {
    throw new AppError(403, "Only doctors can write prescriptions");
  }

  const parsed = writePrescriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid prescription payload", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const prescription = await writePrescriptionService(
    req.params.id ?? "",
    req.user.id,
    parsed.data,
  );
  res.status(201).json({ success: true, data: { prescription } });
};

export const getPrescription = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");

  const prescription = await getPrescriptionByAppointment(
    req.params.id ?? "",
    req.user.id,
  );
  res.json({ success: true, data: { prescription } });
};

export const listMyPrescriptions = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");

  const prescriptionList = await listMyPrescriptionsService(
    req.user.id,
    req.user.role,
  );
  res.json({ success: true, data: { prescriptions: prescriptionList } });
};
