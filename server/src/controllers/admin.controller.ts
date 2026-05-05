import type { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import {
  listUsersQuerySchema,
  listUnverifiedDoctorsQuerySchema,
  verifyDoctorBodySchema,
} from "../schemas/admin.schema";
import {
  listUsers as listUsersService,
  listUnverifiedDoctors as listUnverifiedDoctorsService,
  setDoctorVerified,
  getPlatformStats as getPlatformStatsService,
} from "../services/admin.service";

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  const parsed = listUsersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Invalid query parameters", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }
  const result = await listUsersService(parsed.data);
  res.json({ success: true, data: result });
};

export const listUnverifiedDoctors = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsed = listUnverifiedDoctorsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Invalid query parameters", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }
  const result = await listUnverifiedDoctorsService(parsed.data);
  res.json({ success: true, data: result });
};

export const verifyDoctor = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsed = verifyDoctorBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid body", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }
  const profile = await setDoctorVerified(
    req.params.id ?? "",
    parsed.data.isVerified,
  );
  res.json({ success: true, data: { doctor: profile } });
};

export const getPlatformStats = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const stats = await getPlatformStatsService();
  res.json({ success: true, data: { stats } });
};
