import { count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../config/db";
import {
  appointments,
  doctorProfiles,
  prescriptionMedications,
  prescriptions,
  users,
} from "../db/schema";
import { AppError } from "../utils/AppError";
import { emitToUser } from "../socket";
import {
  type WritePrescriptionInput,
  type ListPrescriptionsQuery,
  PRESCRIPTIONS_PAGE_SIZE,
} from "../schemas/prescription.schema";

export interface MedicationRow {
  id: string;
  prescriptionId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
}

export interface PrescriptionRow {
  id: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  notes: string | null;
  createdAt: Date;
}

export interface PrescriptionDetail extends PrescriptionRow {
  doctorName: string;
  patientName: string;
  medications: MedicationRow[];
}

export interface PrescriptionListItem {
  id: string;
  appointmentId: string;
  appointmentDate: string;
  otherPartyName: string;
  medicationCount: number;
  createdAt: Date;
}

export interface PrescriptionsResult {
  prescriptions: PrescriptionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export const writePrescription = async (
  appointmentId: string,
  doctorUserId: string,
  input: WritePrescriptionInput,
): Promise<PrescriptionDetail> => {
  const appointment = await db.query.appointments.findFirst({
    where: eq(appointments.id, appointmentId),
  });
  if (!appointment) throw new AppError(404, "Appointment not found");

  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, doctorUserId),
  });
  if (!profile || profile.id !== appointment.doctorId) {
    throw new AppError(403, "Not authorized");
  }

  if (appointment.status !== "completed") {
    throw new AppError(409, "Prescription requires a completed appointment");
  }

  const existing = await db.query.prescriptions.findFirst({
    where: eq(prescriptions.appointmentId, appointmentId),
  });
  if (existing) {
    throw new AppError(409, "Prescription already exists for this appointment");
  }

  const result = await db.transaction(async (tx) => {
    const [rx] = await tx
      .insert(prescriptions)
      .values({
        appointmentId,
        doctorId: doctorUserId,
        patientId: appointment.patientId,
        notes: input.notes ?? null,
      })
      .returning();
    if (!rx) throw new AppError(500, "Failed to create prescription");

    const meds = await tx
      .insert(prescriptionMedications)
      .values(
        input.medications.map((m) => ({
          prescriptionId: rx.id,
          medicationName: m.medicationName,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          instructions: m.instructions ?? null,
        })),
      )
      .returning();

    return { rx, meds };
  });

  const [doctorUser, patientUser] = await Promise.all([
    db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, doctorUserId))
      .limit(1),
    db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, appointment.patientId))
      .limit(1),
  ]);

  emitToUser(appointment.patientId, "prescription:new", {
    appointmentId,
    prescriptionId: result.rx.id,
  });

  return {
    ...result.rx,
    doctorName: doctorUser[0]?.fullName ?? "Unknown",
    patientName: patientUser[0]?.fullName ?? "Unknown",
    medications: result.meds,
  };
};

export const getPrescriptionByAppointment = async (
  appointmentId: string,
  userId: string,
): Promise<PrescriptionDetail> => {
  const rx = await db.query.prescriptions.findFirst({
    where: eq(prescriptions.appointmentId, appointmentId),
  });
  if (!rx) throw new AppError(404, "Prescription not found");

  if (rx.patientId !== userId && rx.doctorId !== userId) {
    throw new AppError(403, "Not authorized");
  }

  const [meds, doctorUser, patientUser] = await Promise.all([
    db
      .select()
      .from(prescriptionMedications)
      .where(eq(prescriptionMedications.prescriptionId, rx.id)),
    db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, rx.doctorId))
      .limit(1),
    db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, rx.patientId))
      .limit(1),
  ]);

  return {
    ...rx,
    doctorName: doctorUser[0]?.fullName ?? "Unknown",
    patientName: patientUser[0]?.fullName ?? "Unknown",
    medications: meds,
  };
};

export const listMyPrescriptions = async (
  userId: string,
  role: string,
  query: ListPrescriptionsQuery,
): Promise<PrescriptionsResult> => {
  const where =
    role === "patient"
      ? eq(prescriptions.patientId, userId)
      : eq(prescriptions.doctorId, userId);
  const joinUser =
    role === "patient"
      ? eq(users.id, prescriptions.doctorId)
      : eq(users.id, prescriptions.patientId);

  const [countRows, rows] = await Promise.all([
    db.select({ total: count() }).from(prescriptions).where(where),
    db
      .select({
        id: prescriptions.id,
        appointmentId: prescriptions.appointmentId,
        appointmentDate: appointments.appointmentDate,
        otherPartyName: users.fullName,
        createdAt: prescriptions.createdAt,
      })
      .from(prescriptions)
      .innerJoin(appointments, eq(appointments.id, prescriptions.appointmentId))
      .innerJoin(users, joinUser)
      .where(where)
      .orderBy(desc(prescriptions.createdAt))
      .limit(PRESCRIPTIONS_PAGE_SIZE)
      .offset((query.page - 1) * PRESCRIPTIONS_PAGE_SIZE),
  ]);

  const items = await attachMedicationCounts(rows);
  return {
    prescriptions: items,
    total: countRows[0]?.total ?? 0,
    page: query.page,
    pageSize: PRESCRIPTIONS_PAGE_SIZE,
  };
};

const attachMedicationCounts = async (
  rows: {
    id: string;
    appointmentId: string;
    appointmentDate: string;
    otherPartyName: string;
    createdAt: Date;
  }[],
): Promise<PrescriptionListItem[]> => {
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const countRows = await db
    .select({
      prescriptionId: prescriptionMedications.prescriptionId,
      total: count(),
    })
    .from(prescriptionMedications)
    .where(inArray(prescriptionMedications.prescriptionId, ids))
    .groupBy(prescriptionMedications.prescriptionId);

  const countMap = new Map(countRows.map((c) => [c.prescriptionId, c.total]));

  return rows.map((r) => ({
    ...r,
    medicationCount: countMap.get(r.id) ?? 0,
  }));
};
