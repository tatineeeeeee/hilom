import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../config/db";
import {
  appointments,
  doctorProfiles,
  doctorSchedules,
  prescriptions,
  reviews,
  specializations,
  users,
} from "../db/schema";
import { AppError } from "../utils/AppError";
import {
  todayInManila,
  nowHHMMInManila,
  addDaysToManilaDate,
} from "../utils/manilaTime";
import { generateSlots } from "./slot.service";
import { findOrCreateConversation } from "./chat.service";
import { createPaymentForAppointment } from "./payment.service";
import {
  APPOINTMENT_PAGE_SIZE,
  type BookAppointmentInput,
  type ListAppointmentsQuery,
} from "../schemas/appointment.schema";

export interface AppointmentRow {
  id: string;
  doctorId: string;
  doctorName: string;
  specializationName: string;
  appointmentDate: string;
  slotStart: string;
  slotEnd: string;
  status: string;
  reason: string | null;
  notes: string | null;
  hasReview: boolean;
  hasPrescription: boolean;
  createdAt: Date;
}

export interface AppointmentsResult {
  appointments: AppointmentRow[];
  total: number;
  page: number;
  pageSize: number;
}

export const bookAppointment = async (
  patientId: string,
  input: BookAppointmentInput,
) => {
  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.id, input.doctorId),
  });
  if (!profile) throw new AppError(404, "Doctor not found");

  const today = todayInManila();
  const maxDate = addDaysToManilaDate(today, 30);

  if (input.appointmentDate < today || input.appointmentDate > maxDate) {
    throw new AppError(409, "Slot is no longer available");
  }

  const [schedule, existingAppts] = await Promise.all([
    db.query.doctorSchedules.findMany({
      where: eq(doctorSchedules.doctorId, profile.id),
    }),
    db.query.appointments.findMany({
      where: eq(appointments.doctorId, profile.id),
    }),
  ]);

  const now = { dateStr: today, timeStr: nowHHMMInManila() };

  const availableSlots = generateSlots({
    date: input.appointmentDate,
    slotDurationMinutes: profile.slotDurationMinutes,
    schedule,
    appointments: existingAppts.map((a) => ({
      appointmentDate: a.appointmentDate,
      slotStart: a.slotStart,
      slotEnd: a.slotEnd,
      status: a.status,
    })),
    now,
  });

  const slotMatch = availableSlots.find(
    (s) => s.start === input.slotStart && s.end === input.slotEnd,
  );
  if (!slotMatch) throw new AppError(409, "Slot is no longer available");

  return db.transaction(async (tx) => {
    const conflict = await tx.query.appointments.findFirst({
      where: and(
        eq(appointments.doctorId, input.doctorId),
        eq(appointments.appointmentDate, input.appointmentDate),
        eq(appointments.slotStart, input.slotStart + ":00"),
        inArray(appointments.status, ["pending", "confirmed"]),
      ),
    });
    if (conflict) throw new AppError(409, "Slot is no longer available");

    const [inserted] = await tx
      .insert(appointments)
      .values({
        patientId,
        doctorId: input.doctorId,
        appointmentDate: input.appointmentDate,
        slotStart: input.slotStart,
        slotEnd: input.slotEnd,
        reason: input.reason ?? null,
      })
      .returning();

    if (!inserted) throw new AppError(500, "Failed to create appointment");

    const { payment, clientKey } = await createPaymentForAppointment(
      {
        appointmentId: inserted.id,
        patientId,
        doctorUserId: profile.userId,
        amount: profile.consultationFee,
      },
      tx,
    );

    return { appointment: inserted, payment, clientKey };
  });
};

const toHHMM = (t: string): string => t.slice(0, 5);

export const listPatientAppointments = async (
  patientId: string,
  query: ListAppointmentsQuery,
): Promise<AppointmentsResult> => {
  const conditions = [eq(appointments.patientId, patientId)];
  if (query.status) {
    conditions.push(eq(appointments.status, query.status));
  }

  const where = and(...conditions);

  const [countRows, rows] = await Promise.all([
    db.select({ count: count() }).from(appointments).where(where),
    db
      .select({
        id: appointments.id,
        doctorId: appointments.doctorId,
        doctorName: users.fullName,
        specializationName: specializations.name,
        appointmentDate: appointments.appointmentDate,
        slotStart: appointments.slotStart,
        slotEnd: appointments.slotEnd,
        status: appointments.status,
        reason: appointments.reason,
        notes: appointments.notes,
        reviewId: reviews.id,
        prescriptionId: prescriptions.id,
        createdAt: appointments.createdAt,
      })
      .from(appointments)
      .innerJoin(doctorProfiles, eq(appointments.doctorId, doctorProfiles.id))
      .innerJoin(users, eq(doctorProfiles.userId, users.id))
      .innerJoin(
        specializations,
        eq(doctorProfiles.specializationId, specializations.id),
      )
      .leftJoin(reviews, eq(reviews.appointmentId, appointments.id))
      .leftJoin(prescriptions, eq(prescriptions.appointmentId, appointments.id))
      .where(where)
      .orderBy(desc(appointments.createdAt))
      .limit(APPOINTMENT_PAGE_SIZE)
      .offset((query.page - 1) * APPOINTMENT_PAGE_SIZE),
  ]);

  return {
    appointments: rows.map((r) => ({
      ...r,
      reviewId: undefined,
      prescriptionId: undefined,
      hasReview: r.reviewId !== null,
      hasPrescription: r.prescriptionId !== null,
      slotStart: toHHMM(r.slotStart),
      slotEnd: toHHMM(r.slotEnd),
    })),
    total: countRows[0]?.count ?? 0,
    page: query.page,
    pageSize: APPOINTMENT_PAGE_SIZE,
  };
};

export const findAppointmentById = async (id: string) => {
  const rows = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      appointmentDate: appointments.appointmentDate,
      slotStart: appointments.slotStart,
      slotEnd: appointments.slotEnd,
      status: appointments.status,
      reason: appointments.reason,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
    })
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);

  return rows[0] ?? null;
};

export interface DoctorAppointmentRow {
  id: string;
  patientId: string;
  patientName: string;
  appointmentDate: string;
  slotStart: string;
  slotEnd: string;
  status: string;
  reason: string | null;
  notes: string | null;
  hasPrescription: boolean;
  createdAt: Date;
}

export interface DoctorAppointmentsResult {
  appointments: DoctorAppointmentRow[];
  total: number;
  page: number;
  pageSize: number;
}

export const listDoctorAppointments = async (
  doctorUserId: string,
  query: ListAppointmentsQuery,
): Promise<DoctorAppointmentsResult> => {
  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, doctorUserId),
  });
  if (!profile) throw new AppError(404, "Doctor profile not found");

  const conditions = [eq(appointments.doctorId, profile.id)];
  if (query.status) {
    conditions.push(eq(appointments.status, query.status));
  }

  const where = and(...conditions);

  const [countRows, rows] = await Promise.all([
    db.select({ count: count() }).from(appointments).where(where),
    db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        patientName: users.fullName,
        appointmentDate: appointments.appointmentDate,
        slotStart: appointments.slotStart,
        slotEnd: appointments.slotEnd,
        status: appointments.status,
        reason: appointments.reason,
        notes: appointments.notes,
        prescriptionId: prescriptions.id,
        createdAt: appointments.createdAt,
      })
      .from(appointments)
      .innerJoin(users, eq(appointments.patientId, users.id))
      .leftJoin(prescriptions, eq(prescriptions.appointmentId, appointments.id))
      .where(where)
      .orderBy(desc(appointments.createdAt))
      .limit(APPOINTMENT_PAGE_SIZE)
      .offset((query.page - 1) * APPOINTMENT_PAGE_SIZE),
  ]);

  return {
    appointments: rows.map((r) => ({
      ...r,
      prescriptionId: undefined,
      hasPrescription: r.prescriptionId !== null,
      slotStart: toHHMM(r.slotStart),
      slotEnd: toHHMM(r.slotEnd),
    })),
    total: countRows[0]?.count ?? 0,
    page: query.page,
    pageSize: APPOINTMENT_PAGE_SIZE,
  };
};

type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

const VALID_TRANSITIONS: Record<
  string,
  Partial<Record<AppointmentStatus, AppointmentStatus[]>>
> = {
  patient: {
    pending: ["cancelled"],
  },
  doctor: {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled"],
  },
};

export const updateAppointmentStatus = async (
  appointmentId: string,
  newStatus: AppointmentStatus,
  requestingUser: { id: string; role: string },
) => {
  const appointment = await findAppointmentById(appointmentId);
  if (!appointment) throw new AppError(404, "Appointment not found");

  const currentStatus = appointment.status as AppointmentStatus;

  // Authorization: verify the requesting user owns this appointment
  if (requestingUser.role === "patient") {
    if (appointment.patientId !== requestingUser.id) {
      throw new AppError(403, "Not authorized");
    }
  } else if (requestingUser.role === "doctor") {
    const profile = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.userId, requestingUser.id),
    });
    if (!profile || profile.id !== appointment.doctorId) {
      throw new AppError(403, "Not authorized");
    }
  } else {
    throw new AppError(403, "Not authorized");
  }

  const allowed = VALID_TRANSITIONS[requestingUser.role]?.[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new AppError(
      409,
      `Cannot transition from ${currentStatus} to ${newStatus}`,
    );
  }

  const [updated] = await db
    .update(appointments)
    .set({ status: newStatus })
    .where(eq(appointments.id, appointmentId))
    .returning();

  if (newStatus === "confirmed" && updated) {
    const profile = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.id, appointment.doctorId),
    });
    if (profile) {
      await findOrCreateConversation(
        appointmentId,
        appointment.patientId,
        profile.userId,
      );
    }
  }

  return updated;
};
