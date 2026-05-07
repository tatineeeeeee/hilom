import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../config/db";
import {
  users,
  patientProfiles,
  doctorProfiles,
  doctorSchedules,
} from "../db/schema";
import { AppError } from "../utils/AppError";
import {
  profileUpdateSchema,
  type DoctorProfileUpdateInput,
  type PatientProfileUpdateInput,
} from "../schemas/profile.schema";
import { scheduleArraySchema } from "../schemas/schedule.schema";
import { getDoctorStats as getDoctorStatsService } from "../services/doctor.service";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

interface PublicUser {
  id: string;
  email: string;
  role: "patient" | "doctor" | "admin";
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  emailVerifiedAt: string | null;
}

const toPublicUser = (u: typeof users.$inferSelect): PublicUser => ({
  id: u.id,
  email: u.email,
  role: u.role,
  fullName: u.fullName,
  avatarUrl: u.avatarUrl,
  phone: u.phone,
  emailVerifiedAt: u.emailVerifiedAt ? u.emailVerifiedAt.toISOString() : null,
});

const toPatientColumns = (input: PatientProfileUpdateInput) => ({
  dateOfBirth: input.dateOfBirth ?? null,
  bloodType: input.bloodType ?? null,
  allergies: input.allergies ?? null,
  emergencyContactName: input.emergencyContactName ?? null,
  emergencyContactPhone: input.emergencyContactPhone ?? null,
});

const toDoctorColumns = (input: DoctorProfileUpdateInput, userId: string) => ({
  userId,
  specializationId: input.specializationId,
  bio: input.bio,
  yearsOfExperience: input.yearsOfExperience,
  consultationFee: input.consultationFee.toFixed(2),
  clinicAddress: input.clinicAddress ?? null,
  slotDurationMinutes: input.slotDurationMinutes ?? 30,
});

export const getMyProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");

  const user = await db.query.users.findFirst({
    where: eq(users.id, req.user.id),
  });
  if (!user) throw new AppError(404, "User not found");

  if (user.role === "patient") {
    const profile = await db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.userId, user.id),
    });
    res.json({
      success: true,
      data: { user: toPublicUser(user), profile: profile ?? null },
    });
    return;
  }

  if (user.role === "doctor") {
    const profile = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.userId, user.id),
    });
    res.json({
      success: true,
      data: { user: toPublicUser(user), profile: profile ?? null },
    });
    return;
  }

  res.json({
    success: true,
    data: { user: toPublicUser(user), profile: null },
  });
};

export const updateMyProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");

  const role = req.user.role;
  if (role === "admin") {
    throw new AppError(400, "Admins do not have a profile");
  }

  const rawBody: unknown = req.body;
  const bodyObject: Record<string, unknown> = isRecord(rawBody)
    ? { ...rawBody }
    : {};

  const bodyRole = bodyObject.role;
  if (typeof bodyRole === "string" && bodyRole !== role) {
    throw new AppError(400, "Role in body does not match authenticated user");
  }

  const parsed = profileUpdateSchema.safeParse({ ...bodyObject, role });
  if (!parsed.success) {
    throw new AppError(400, "Invalid profile payload", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  if (parsed.data.role === "patient") {
    await db
      .update(patientProfiles)
      .set(toPatientColumns(parsed.data))
      .where(eq(patientProfiles.userId, req.user.id));

    const updated = await db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.userId, req.user.id),
    });
    res.json({ success: true, data: { profile: updated ?? null } });
    return;
  }

  const columns = toDoctorColumns(parsed.data, req.user.id);
  await db
    .insert(doctorProfiles)
    .values(columns)
    .onConflictDoUpdate({
      target: doctorProfiles.userId,
      set: {
        specializationId: columns.specializationId,
        bio: columns.bio,
        yearsOfExperience: columns.yearsOfExperience,
        consultationFee: columns.consultationFee,
        clinicAddress: columns.clinicAddress,
        slotDurationMinutes: columns.slotDurationMinutes,
      },
    });

  const updated = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, req.user.id),
  });
  res.json({ success: true, data: { profile: updated ?? null } });
};

export const getMySchedule = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");
  if (req.user.role !== "doctor") throw new AppError(403, "Doctors only");

  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, req.user.id),
  });
  if (!profile) throw new AppError(404, "Complete your profile first");

  const schedule = await db.query.doctorSchedules.findMany({
    where: eq(doctorSchedules.doctorId, profile.id),
  });

  res.json({ success: true, data: { schedule } });
};

export const updateMySchedule = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");
  if (req.user.role !== "doctor") throw new AppError(403, "Doctors only");

  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, req.user.id),
  });
  if (!profile) throw new AppError(404, "Complete your profile first");

  const parsed = scheduleArraySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid schedule payload", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const entries = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .delete(doctorSchedules)
      .where(eq(doctorSchedules.doctorId, profile.id));

    if (entries.length > 0) {
      await tx.insert(doctorSchedules).values(
        entries.map((e) => ({
          doctorId: profile.id,
          dayOfWeek: e.dayOfWeek,
          startTime: e.startTime,
          endTime: e.endTime,
          isActive: e.isActive,
        })),
      );
    }
  });

  const updated = await db.query.doctorSchedules.findMany({
    where: eq(doctorSchedules.doctorId, profile.id),
  });

  res.json({ success: true, data: { schedule: updated } });
};

export const getDoctorStats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");
  if (req.user.role !== "doctor") {
    throw new AppError(403, "Only doctors have stats");
  }
  const stats = await getDoctorStatsService(req.user.id);
  res.json({ success: true, data: { stats } });
};
