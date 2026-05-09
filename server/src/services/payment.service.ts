import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../config/db";
import { appointments, doctorProfiles, payments, users } from "../db/schema";
import { AppError } from "../utils/AppError";
import { createPaymentIntent, refundPaymentIntent } from "./paymongo.service";
import {
  type ListPaymentsQuery,
  PAYMENTS_PAGE_SIZE,
} from "../schemas/payment.schema";

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

export interface PaymentsResult {
  payments: PaymentListItem[];
  total: number;
  page: number;
  pageSize: number;
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

  const needsPayMongoRefund =
    (payment.status === "escrowed" || payment.status === "released") &&
    payment.paymongoPaymentIntentId !== null;

  // Atomic conditional UPDATE: only one concurrent caller will win.
  // The WHERE guard prevents double-processing even under concurrent calls.
  const [updated] = await runner
    .update(payments)
    .set({ status: "refunded", refundedAt: new Date() })
    .where(
      and(
        eq(payments.id, payment.id),
        inArray(payments.status, ["pending", "escrowed", "released"]),
      ),
    )
    .returning();

  if (!updated) return;

  if (needsPayMongoRefund && payment.paymongoPaymentIntentId) {
    await refundPaymentIntent(
      payment.paymongoPaymentIntentId,
      centavosFromDecimal(payment.amount),
    );
  }
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
  query: ListPaymentsQuery,
): Promise<PaymentsResult> => {
  const where =
    role === "patient"
      ? eq(payments.patientId, userId)
      : eq(payments.doctorId, userId);
  const joinUser =
    role === "patient"
      ? eq(users.id, payments.doctorId)
      : eq(users.id, payments.patientId);

  const [countRows, rows] = await Promise.all([
    db.select({ total: count() }).from(payments).where(where),
    db
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
      .innerJoin(users, joinUser)
      .where(where)
      .orderBy(desc(payments.createdAt))
      .limit(PAYMENTS_PAGE_SIZE)
      .offset((query.page - 1) * PAYMENTS_PAGE_SIZE),
  ]);

  return {
    payments: rows,
    total: countRows[0]?.total ?? 0,
    page: query.page,
    pageSize: PAYMENTS_PAGE_SIZE,
  };
};

export const markPaidByIntentId = async (
  intentId: string,
): Promise<PaymentRow | null> => {
  const [updated] = await db
    .update(payments)
    .set({ status: "escrowed", paidAt: new Date() })
    .where(
      and(
        eq(payments.paymongoPaymentIntentId, intentId),
        eq(payments.status, "pending"),
      ),
    )
    .returning();

  if (updated) return updated;

  const existing = await db.query.payments.findFirst({
    where: eq(payments.paymongoPaymentIntentId, intentId),
  });
  return existing ?? null;
};
