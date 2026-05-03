import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../config/db";
import { doctorProfiles, doctorSchedules, appointments } from "../db/schema";
import { AppError } from "../utils/AppError";
import {
  todayInManila,
  nowHHMMInManila,
  addDaysToManilaDate,
} from "../utils/manilaTime";
import { generateSlots } from "../services/slot.service";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = (str: string): boolean => {
  if (!DATE_RE.test(str)) return false;
  const d = new Date(str + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
};

export const getDoctorSlots = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const { date } = req.query;

  if (typeof date !== "string" || !isValidDate(date)) {
    throw new AppError(400, "date must be a valid YYYY-MM-DD");
  }

  const today = todayInManila();
  const maxDate = addDaysToManilaDate(today, 30);

  if (date > maxDate) {
    throw new AppError(400, "date is out of range (max 30 days from today)");
  }

  if (date < today) {
    res.json({ success: true, data: { slots: [] } });
    return;
  }

  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.id, id ?? ""),
  });
  if (!profile) throw new AppError(404, "Doctor not found");

  const [schedule, appts] = await Promise.all([
    db.query.doctorSchedules.findMany({
      where: eq(doctorSchedules.doctorId, profile.id),
    }),
    db.query.appointments.findMany({
      where: eq(appointments.doctorId, profile.id),
    }),
  ]);

  const now = { dateStr: today, timeStr: nowHHMMInManila() };

  const slots = generateSlots({
    date,
    slotDurationMinutes: profile.slotDurationMinutes,
    schedule,
    appointments: appts.map((a) => ({
      appointmentDate: a.appointmentDate,
      slotStart: a.slotStart,
      slotEnd: a.slotEnd,
      status: a.status,
    })),
    now,
  });

  res.json({ success: true, data: { slots } });
};
