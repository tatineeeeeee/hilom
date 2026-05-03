import type { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { listDoctorsQuerySchema } from "../schemas/doctor.schema";
import {
  findPublicDoctors,
  findPublicDoctorById,
} from "../services/doctor.service";

export const listDoctors = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsed = listDoctorsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Invalid query parameters", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const result = await findPublicDoctors(parsed.data);
  res.json({ success: true, data: result });
};

export const getDoctor = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const doctor = await findPublicDoctorById(id ?? "");
  if (!doctor) throw new AppError(404, "Doctor not found");
  res.json({ success: true, data: { doctor } });
};
