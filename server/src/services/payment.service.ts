import { desc, eq } from "drizzle-orm";
import { db } from "../config/db";
import { appointments, doctorProfiles, payments, users } from "../db/schema";
import { AppError } from "../utils/AppError";
import { createPaymentIntent, refundPaymentIntent } from "./paymongo.service";

export interface PaymentRow {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  amount: string;
  status: "pending" | "escrowed" | "released" | "refunded";
  paymongoPaymentIntentId: string | null;
  createdAt: Date;
  paidAt: Date | null;
  releasedAt: Date | null;
  refundedAt: Date | null;
}

export interface PaymentListItem extends PaymentRow {
  otherPartyName: string;
  appointmentDate: string;
}

interface CreatePaymentInput {
  appointmentId: string;
  patientId: string;
  doctorUserId: string;
  amount: string;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const pesoStringToCentavos = (peso: string): number => {
  const parsed = Number.parseFloat(peso);
  if (Number.isNaN(parsed)) throw new AppError(500, "Invalid amount");
  return Math.round(parsed * 100);
};

const centavosFromDecimal = (amount: string): number =>
  pesoStringToCentavos(amount);

export const createPaymentForAppointment = async (
  input: CreatePaymentInput,
  tx?: Tx,
): Promise<{ payment: PaymentRow; clientKey: string }> => {
  const runner = tx ?? db;

  const existing = await runner.query.payments.findFirst({
    where: eq(payments.appointmentId, input.appointmentId),
  });
  if (existing) {
    return {
      payment: existing,
      clientKey: existing.paymongoPaymentIntentId
        ? `${existing.paymongoPaymentIntentId}_client_existing`
        : "",
    };
  }

  const intent = await createPaymentIntent(
    pesoStringToCentavos(input.amount),
    `Hilom appointment ${input.appointmentId}`,
  );

  const [inserted] = await runner
    .insert(payments)
    .values({
      appointmentId: input.appointmentId,
      patientId: input.patientId,
      doctorId: input.doctorUserId,
      amount: input.amount,
      paymongoPaymentIntentId: intent.intentId,
    })
    .returning();

  if (!inserted) throw new AppError(500, "Failed to create payment");

  return { payment: inserted, clientKey: intent.clientKey };
};

export const confirmPayment = async (
  appointmentId: string,
  requestingUserId: string,
): Promise<PaymentRow> => {
  const payment = await db.query.payments.findFirst({
    where: eq(payments.appointmentId, appointmentId),
  });
  if (!payment) throw new AppError(404, "Payment not found");

  if (payment.patientId !== requestingUserId) {
    throw new AppError(403, "Not authorized");
  }

  if (payment.status !== "pending") {
    return payment;
  }

  const [updated] = await db
    .update(payments)
    .set({ status: "escrowed", paidAt: new Date() })
    .where(eq(payments.id, payment.id))
    .returning();

  if (!updated) throw new AppError(500, "Failed to confirm payment");
  return updated;
};

export const releaseEscrow = async (
  appointmentId: string,
  tx?: Tx,
): Promise<void> => {
  const runner = tx ?? db;
  const payment = await runner.query.payments.findFirst({
    where: eq(payments.appointmentId, appointmentId),
  });
  if (!payment) return;
  if (payment.status !== "escrowed") return;

  await runner
    .update(payments)
    .set({ status: "released", releasedAt: new Date() })
    .where(eq(payments.id, payment.id));
};

export const refundPayment = async (
  appointmentId: string,
  tx?: Tx,
): Promise<void> => {
  const runner = tx ?? db;
  const payment = await runner.query.payments.findFirst({
    where: eq(payments.appointmentId, appointmentId),
  });
  if (!payment) return;
  if (payment.status === "refunded") return;

  if (payment.status === "escrowed" || payment.status === "released") {
    if (payment.paymongoPaymentIntentId) {
      await refundPaymentIntent(
        payment.paymongoPaymentIntentId,
        centavosFromDecimal(payment.amount),
      );
    }
  }

  await runner
    .update(payments)
    .set({ status: "refunded", refundedAt: new Date() })
    .where(eq(payments.id, payment.id));
};

export const getPaymentByAppointment = async (
  appointmentId: string,
  userId: string,
): Promise<PaymentRow> => {
  const payment = await db.query.payments.findFirst({
    where: eq(payments.appointmentId, appointmentId),
  });
  if (!payment) throw new AppError(404, "Payment not found");

  const appointment = await db.query.appointments.findFirst({
    where: eq(appointments.id, appointmentId),
  });
  if (!appointment) throw new AppError(404, "Appointment not found");

  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.id, appointment.doctorId),
  });

  const isPatient = appointment.patientId === userId;
  const isDoctor = profile?.userId === userId;
  if (!isPatient && !isDoctor) throw new AppError(403, "Not authorized");

  return payment;
};

export const listMyPayments = async (
  userId: string,
  role: string,
): Promise<PaymentListItem[]> => {
  if (role === "patient") {
    const rows = await db
      .select({
        id: payments.id,
        appointmentId: payments.appointmentId,
        patientId: payments.patientId,
        doctorId: payments.doctorId,
        amount: payments.amount,
        status: payments.status,
        paymongoPaymentIntentId: payments.paymongoPaymentIntentId,
        createdAt: payments.createdAt,
        paidAt: payments.paidAt,
        releasedAt: payments.releasedAt,
        refundedAt: payments.refundedAt,
        otherPartyName: users.fullName,
        appointmentDate: appointments.appointmentDate,
      })
      .from(payments)
      .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
      .innerJoin(users, eq(users.id, payments.doctorId))
      .where(eq(payments.patientId, userId))
      .orderBy(desc(payments.createdAt));
    return rows;
  }

  const rows = await db
    .select({
      id: payments.id,
      appointmentId: payments.appointmentId,
      patientId: payments.patientId,
      doctorId: payments.doctorId,
      amount: payments.amount,
      status: payments.status,
      paymongoPaymentIntentId: payments.paymongoPaymentIntentId,
      createdAt: payments.createdAt,
      paidAt: payments.paidAt,
      releasedAt: payments.releasedAt,
      refundedAt: payments.refundedAt,
      otherPartyName: users.fullName,
      appointmentDate: appointments.appointmentDate,
    })
    .from(payments)
    .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
    .innerJoin(users, eq(users.id, payments.patientId))
    .where(eq(payments.doctorId, userId))
    .orderBy(desc(payments.createdAt));
  return rows;
};

export const markPaidByIntentId = async (
  intentId: string,
): Promise<PaymentRow | null> => {
  const payment = await db.query.payments.findFirst({
    where: eq(payments.paymongoPaymentIntentId, intentId),
  });
  if (!payment) return null;
  if (payment.status !== "pending") return payment;

  const [updated] = await db
    .update(payments)
    .set({ status: "escrowed", paidAt: new Date() })
    .where(eq(payments.id, payment.id))
    .returning();

  return updated ?? null;
};
