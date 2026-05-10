import crypto from "node:crypto";
import request from "supertest";
import { eq } from "drizzle-orm";

import { app } from "../src/app";
import { db } from "../src/config/db";
import { doctorProfiles, doctorSchedules, payments } from "../src/db/schema";
import { seedTestSpecializations } from "./helpers/seedSpecializations";
import {
  bearer,
  registerDoctor,
  registerPatient,
  type TestSession,
} from "./helpers/auth";
import {
  todayInManila,
  addDaysToManilaDate,
  manilaDateDayOfWeek,
} from "../src/utils/manilaTime";

const getSpecId = async (name: string): Promise<number> => {
  const { specializations } = await import("../src/db/schema");
  const row = await db.query.specializations.findFirst({
    where: eq(specializations.name, name),
  });
  if (!row) throw new Error(`Fixture: ${name} not seeded`);
  return row.id;
};

const nextDate = (dow: number): string => {
  const today = todayInManila();
  const todayDow = manilaDateDayOfWeek(today);
  const daysAhead = (dow - todayDow + 7) % 7 || 7;
  return addDaysToManilaDate(today, daysAhead);
};

interface DoctorFixture {
  session: TestSession;
  profileId: string;
  fee: number;
}

const setupDoctor = async (
  email: string,
  fee = 1500,
): Promise<DoctorFixture> => {
  const specId = await getSpecId("General Practice");
  const session = await registerDoctor(email);
  await request(app)
    .put("/api/me/profile")
    .set("Authorization", bearer(session))
    .send({
      specializationId: specId,
      bio: "Payment test doctor.",
      yearsOfExperience: 5,
      consultationFee: fee,
      slotDurationMinutes: 30,
    });
  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, session.userId),
  });
  if (!profile) throw new Error("Doctor profile not found after setup");
  return { session, profileId: profile.id, fee };
};

const seedSchedule = async (
  doctorId: string,
  entries: { dayOfWeek: number; startTime: string; endTime: string }[],
) => {
  await db
    .insert(doctorSchedules)
    .values(entries.map((e) => ({ doctorId, ...e, isActive: true })));
};

const bookSlot = async (
  patientSession: TestSession,
  profileId: string,
  date: string,
  slotStart: string,
  slotEnd: string,
): Promise<{
  appointmentId: string;
  paymentId: string;
  amount: string;
  status: string;
  clientKey: string;
}> => {
  const res = await request(app)
    .post("/api/appointments")
    .set("Authorization", bearer(patientSession))
    .send({ doctorId: profileId, appointmentDate: date, slotStart, slotEnd });
  if (res.status !== 201) {
    throw new Error(`book failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return {
    appointmentId: res.body.data.appointment.id,
    paymentId: res.body.data.payment.id,
    amount: res.body.data.payment.amount,
    status: res.body.data.payment.status,
    clientKey: res.body.data.clientKey,
  };
};

describe("POST /api/appointments — payment row creation", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("creates a pending payment for the booked appointment", async () => {
    const {
      session: docSession,
      profileId,
      fee,
    } = await setupDoctor("pay-create@example.com", 1234);
    void docSession;
    const date = nextDate(1);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("pay-create-p@example.com");

    const booked = await bookSlot(patient, profileId, date, "09:00", "09:30");

    expect(booked.paymentId).toBeTruthy();
    expect(booked.status).toBe("pending");
    expect(Number.parseFloat(booked.amount)).toBe(fee);
    expect(booked.clientKey).toMatch(/^pi_stub_/);
  });
});

describe("POST /api/appointments/:id/payment/confirm", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("patient confirms payment → escrowed, paidAt set", async () => {
    const { profileId } = await setupDoctor("pay-confirm@example.com");
    const date = nextDate(2);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("pay-confirm-p@example.com");
    const { appointmentId } = await bookSlot(
      patient,
      profileId,
      date,
      "09:00",
      "09:30",
    );

    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/payment/confirm`)
      .set("Authorization", bearer(patient));

    expect(res.status).toBe(200);
    expect(res.body.data.payment.status).toBe("escrowed");
    expect(res.body.data.payment.paidAt).toBeTruthy();
  });

  it("confirm is idempotent on a paid payment", async () => {
    const { profileId } = await setupDoctor("pay-idempotent@example.com");
    const date = nextDate(3);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("pay-idempotent-p@example.com");
    const { appointmentId } = await bookSlot(
      patient,
      profileId,
      date,
      "09:00",
      "09:30",
    );

    await request(app)
      .post(`/api/appointments/${appointmentId}/payment/confirm`)
      .set("Authorization", bearer(patient));

    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/payment/confirm`)
      .set("Authorization", bearer(patient));

    expect(res.status).toBe(200);
    expect(res.body.data.payment.status).toBe("escrowed");
  });

  it("returns 403 when a different patient tries to confirm", async () => {
    const { profileId } = await setupDoctor("pay-stranger@example.com");
    const date = nextDate(4);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("pay-stranger-p@example.com");
    const { appointmentId } = await bookSlot(
      patient,
      profileId,
      date,
      "09:00",
      "09:30",
    );

    const stranger = await registerPatient("pay-stranger-s@example.com");
    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/payment/confirm`)
      .set("Authorization", bearer(stranger));

    expect(res.status).toBe(403);
  });

  it("returns 403 when a doctor tries to confirm a patient's payment", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "pay-doc-confirm@example.com",
    );
    const date = nextDate(5);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("pay-doc-confirm-p@example.com");
    const { appointmentId } = await bookSlot(
      patient,
      profileId,
      date,
      "09:00",
      "09:30",
    );

    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/payment/confirm`)
      .set("Authorization", bearer(docSession));

    expect(res.status).toBe(403);
  });
});

describe("GET /api/appointments/:id/payment", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("patient and doctor of appt can read the payment", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "pay-read@example.com",
    );
    const date = nextDate(6);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("pay-read-p@example.com");
    const { appointmentId } = await bookSlot(
      patient,
      profileId,
      date,
      "09:00",
      "09:30",
    );

    const patientRes = await request(app)
      .get(`/api/appointments/${appointmentId}/payment`)
      .set("Authorization", bearer(patient));
    expect(patientRes.status).toBe(200);
    expect(patientRes.body.data.payment.status).toBe("pending");

    const doctorRes = await request(app)
      .get(`/api/appointments/${appointmentId}/payment`)
      .set("Authorization", bearer(docSession));
    expect(doctorRes.status).toBe(200);
  });

  it("returns 403 for a stranger", async () => {
    const { profileId } = await setupDoctor("pay-read-403@example.com");
    const date = nextDate(1);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("pay-read-403-p@example.com");
    const { appointmentId } = await bookSlot(
      patient,
      profileId,
      date,
      "09:00",
      "09:30",
    );

    const stranger = await registerPatient("pay-read-403-s@example.com");
    const res = await request(app)
      .get(`/api/appointments/${appointmentId}/payment`)
      .set("Authorization", bearer(stranger));
    expect(res.status).toBe(403);
  });
});

describe("GET /api/payments", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("patient list is scoped to their own payments", async () => {
    const { profileId } = await setupDoctor("pay-list-doc@example.com");
    const date = nextDate(2);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);

    const patient1 = await registerPatient("pay-list-p1@example.com");
    const patient2 = await registerPatient("pay-list-p2@example.com");

    await bookSlot(patient1, profileId, date, "09:00", "09:30");
    await bookSlot(patient2, profileId, date, "09:30", "10:00");

    const res = await request(app)
      .get("/api/payments")
      .set("Authorization", bearer(patient1));
    expect(res.status).toBe(200);
    expect(res.body.data.payments).toHaveLength(1);
  });

  it("doctor list is scoped to payments they receive", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "pay-doclist@example.com",
    );
    const date = nextDate(3);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("pay-doclist-p@example.com");
    await bookSlot(patient, profileId, date, "09:00", "09:30");

    const { session: otherDoc } = await setupDoctor("pay-doclist2@example.com");

    const res = await request(app)
      .get("/api/payments")
      .set("Authorization", bearer(docSession));
    expect(res.status).toBe(200);
    expect(res.body.data.payments).toHaveLength(1);

    const otherRes = await request(app)
      .get("/api/payments")
      .set("Authorization", bearer(otherDoc));
    expect(otherRes.status).toBe(200);
    expect(otherRes.body.data.payments).toHaveLength(0);
  });
});

describe("POST /api/payments/webhook", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("returns 400 on bad signature when secret is configured", async () => {
    process.env.PAYMONGO_WEBHOOK_SECRET = "test-webhook-secret";
    try {
      const body = JSON.stringify({
        data: {
          id: "evt_1",
          attributes: {
            type: "payment.paid",
            data: { attributes: { payment_intent_id: "pi_does_not_matter" } },
          },
        },
      });
      const res = await request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("paymongo-signature", "deadbeef")
        .send(body);
      expect(res.status).toBe(400);
    } finally {
      delete process.env.PAYMONGO_WEBHOOK_SECRET;
    }
  });

  it("returns 400 when the payload fails schema validation", async () => {
    process.env.PAYMONGO_WEBHOOK_SECRET = "test-webhook-secret";
    try {
      const body = JSON.stringify({ data: { id: "evt_malformed" } });
      const signature = crypto
        .createHmac("sha256", "test-webhook-secret")
        .update(body)
        .digest("hex");

      const res = await request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("paymongo-signature", signature)
        .send(body);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    } finally {
      delete process.env.PAYMONGO_WEBHOOK_SECRET;
    }
  });

  it("ignores unknown extra fields (forward-compatible)", async () => {
    const { profileId } = await setupDoctor("pay-webhook-fwd@example.com");
    const date = nextDate(5);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("pay-webhook-fwd-p@example.com");
    const { appointmentId } = await bookSlot(
      patient,
      profileId,
      date,
      "09:00",
      "09:30",
    );

    const row = await db.query.payments.findFirst({
      where: eq(payments.appointmentId, appointmentId),
    });
    if (!row?.paymongoPaymentIntentId) {
      throw new Error("Payment intent ID missing");
    }

    process.env.PAYMONGO_WEBHOOK_SECRET = "test-webhook-secret";
    try {
      const body = JSON.stringify({
        future_field: "should-not-fail-validation",
        data: {
          id: "evt_fwd",
          attributes: {
            type: "payment.paid",
            data: {
              attributes: { payment_intent_id: row.paymongoPaymentIntentId },
            },
          },
        },
      });
      const signature = crypto
        .createHmac("sha256", "test-webhook-secret")
        .update(body)
        .digest("hex");

      const res = await request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("paymongo-signature", signature)
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    } finally {
      delete process.env.PAYMONGO_WEBHOOK_SECRET;
    }
  });

  it("marks the payment escrowed on a valid payment.paid event", async () => {
    const { profileId } = await setupDoctor("pay-webhook@example.com");
    const date = nextDate(4);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("pay-webhook-p@example.com");
    const { appointmentId } = await bookSlot(
      patient,
      profileId,
      date,
      "09:00",
      "09:30",
    );

    const row = await db.query.payments.findFirst({
      where: eq(payments.appointmentId, appointmentId),
    });
    if (!row?.paymongoPaymentIntentId) {
      throw new Error("Payment intent ID missing");
    }

    process.env.PAYMONGO_WEBHOOK_SECRET = "test-webhook-secret";
    try {
      const body = JSON.stringify({
        data: {
          id: "evt_1",
          attributes: {
            type: "payment.paid",
            data: {
              attributes: { payment_intent_id: row.paymongoPaymentIntentId },
            },
          },
        },
      });
      const signature = crypto
        .createHmac("sha256", "test-webhook-secret")
        .update(body)
        .digest("hex");

      const res = await request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("paymongo-signature", signature)
        .send(body);
      expect(res.status).toBe(200);

      const updated = await db.query.payments.findFirst({
        where: eq(payments.id, row.id),
      });
      expect(updated?.status).toBe("escrowed");
      expect(updated?.paidAt).toBeTruthy();
    } finally {
      delete process.env.PAYMONGO_WEBHOOK_SECRET;
    }
  });
});

describe("Payment lifecycle on appointment status transitions", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("completing a paid appointment releases the payment", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "pay-release@example.com",
    );
    const date = nextDate(1);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("pay-release-p@example.com");
    const { appointmentId } = await bookSlot(
      patient,
      profileId,
      date,
      "09:00",
      "09:30",
    );

    await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "confirmed" });
    await request(app)
      .post(`/api/appointments/${appointmentId}/payment/confirm`)
      .set("Authorization", bearer(patient));
    await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "completed" });

    const row = await db.query.payments.findFirst({
      where: eq(payments.appointmentId, appointmentId),
    });
    expect(row?.status).toBe("released");
    expect(row?.releasedAt).toBeTruthy();
  });

  it("cancelling a paid appointment refunds the payment", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "pay-refund@example.com",
    );
    const date = nextDate(2);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("pay-refund-p@example.com");
    const { appointmentId } = await bookSlot(
      patient,
      profileId,
      date,
      "09:00",
      "09:30",
    );

    await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "confirmed" });
    await request(app)
      .post(`/api/appointments/${appointmentId}/payment/confirm`)
      .set("Authorization", bearer(patient));
    await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "cancelled" });

    const row = await db.query.payments.findFirst({
      where: eq(payments.appointmentId, appointmentId),
    });
    expect(row?.status).toBe("refunded");
    expect(row?.refundedAt).toBeTruthy();
  });

  it("cancelling an unpaid pending appointment closes payment as refunded with no PayMongo call", async () => {
    const { profileId } = await setupDoctor("pay-cancel-unpaid@example.com");
    const date = nextDate(3);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("pay-cancel-unpaid-p@example.com");
    const { appointmentId } = await bookSlot(
      patient,
      profileId,
      date,
      "09:00",
      "09:30",
    );

    await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(patient))
      .send({ status: "cancelled" });

    const row = await db.query.payments.findFirst({
      where: eq(payments.appointmentId, appointmentId),
    });
    expect(row?.status).toBe("refunded");
    expect(row?.refundedAt).toBeTruthy();
  });

  it("doctor cannot complete an unpaid appointment", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "pay-noun-paid-complete@example.com",
    );
    const date = nextDate(4);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("pay-noun-paid-p@example.com");
    const { appointmentId } = await bookSlot(
      patient,
      profileId,
      date,
      "09:00",
      "09:30",
    );

    await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "confirmed" });

    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "completed" });

    expect(res.status).toBe(409);
  });

  it("appointment list rows expose paymentStatus", async () => {
    const { profileId } = await setupDoctor("pay-list-status@example.com");
    const date = nextDate(5);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("pay-list-status-p@example.com");
    await bookSlot(patient, profileId, date, "09:00", "09:30");

    const res = await request(app)
      .get("/api/appointments")
      .set("Authorization", bearer(patient));

    expect(res.status).toBe(200);
    expect(res.body.data.appointments).toHaveLength(1);
    expect(res.body.data.appointments[0].paymentStatus).toBe("pending");
  });
});
