import http from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { eq } from "drizzle-orm";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";

import { app } from "../src/app";
import { db } from "../src/config/db";
import {
  doctorProfiles,
  doctorSchedules,
  payments,
  reviews,
  specializations,
} from "../src/db/schema";
import { initSocket, closeSocket } from "../src/socket";
import { seedTestSpecializations } from "./helpers/seedSpecializations";
import {
  bearer,
  registerDoctor,
  registerPatient,
  type TestSession,
} from "./helpers/auth";
import { registerAdmin } from "./helpers/admin";
import { confirmPayment } from "./helpers/payment";
import {
  todayInManila,
  addDaysToManilaDate,
  manilaDateDayOfWeek,
} from "../src/utils/manilaTime";

const getSpecId = async (name: string): Promise<number> => {
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

const setupDoctor = async (
  email: string,
  verified = true,
): Promise<{ session: TestSession; profileId: string }> => {
  const specId = await getSpecId("General Practice");
  const session = await registerDoctor(email);
  await request(app)
    .put("/api/me/profile")
    .set("Authorization", bearer(session))
    .send({
      specializationId: specId,
      bio: "Golden-path doctor.",
      yearsOfExperience: 5,
      consultationFee: 1500,
      slotDurationMinutes: 30,
    });
  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, session.userId),
  });
  if (!profile) throw new Error("Doctor profile missing");
  if (verified) {
    await db
      .update(doctorProfiles)
      .set({ isVerified: true })
      .where(eq(doctorProfiles.id, profile.id));
  }
  return { session, profileId: profile.id };
};

describe("Golden path: book → pay → chat → complete → review", () => {
  let httpServer: http.Server;
  let port: number;

  beforeAll((done) => {
    httpServer = http.createServer(app);
    initSocket(httpServer);
    httpServer.listen(0, () => {
      const addr = httpServer.address() as AddressInfo;
      port = addr.port;
      done();
    });
  });

  afterAll(async () => {
    await closeSocket();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("end-to-end multi-feature flow lands a 5-star review on the doctor's public page", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "golden-doc@example.com",
    );
    const date = nextDate(1);
    const dow = manilaDateDayOfWeek(date);
    await db.insert(doctorSchedules).values({
      doctorId: profileId,
      dayOfWeek: dow,
      startTime: "09:00",
      endTime: "12:00",
      isActive: true,
    });

    const patient = await registerPatient("golden-p@example.com");

    // 1. Book
    const book = await request(app)
      .post("/api/appointments")
      .set("Authorization", bearer(patient))
      .send({
        doctorId: profileId,
        appointmentDate: date,
        slotStart: "09:00",
        slotEnd: "09:30",
      });
    expect(book.status).toBe(201);
    const appointmentId = book.body.data.appointment.id as string;
    expect(book.body.data.payment.status).toBe("pending");

    // 2. Doctor confirms — chat conversation auto-creates
    await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "confirmed" });

    const conv = await request(app)
      .get(`/api/appointments/${appointmentId}/conversation`)
      .set("Authorization", bearer(patient));
    expect(conv.status).toBe(200);
    const conversationId = conv.body.data.conversation.id as string;

    // 3. Patient pays (stub mode)
    await confirmPayment(appointmentId, patient);

    // 4. Round-trip a chat message via Socket.io
    const docSocket: ClientSocket = ioClient(`http://127.0.0.1:${port}`, {
      auth: { token: docSession.accessToken },
      transports: ["websocket"],
      forceNew: true,
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("connect timeout")), 3000);
        docSocket.on("connect", () => {
          clearTimeout(t);
          resolve();
        });
        docSocket.on("connect_error", (err) => {
          clearTimeout(t);
          reject(err);
        });
      });

      const received = new Promise<{ message: { content: string } }>(
        (resolve, reject) => {
          const t = setTimeout(
            () => reject(new Error("message:new timeout")),
            3000,
          );
          docSocket.on(
            "message:new",
            (payload: { message: { content: string } }) => {
              clearTimeout(t);
              resolve(payload);
            },
          );
        },
      );

      const send = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set("Authorization", bearer(patient))
        .send({ content: "Hi doctor!" });
      expect(send.status).toBe(201);

      const payload = await received;
      expect(payload.message.content).toBe("Hi doctor!");
    } finally {
      docSocket.disconnect();
    }

    // 5. Doctor completes — payment releases
    await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "completed" });

    const payRow = await db.query.payments.findFirst({
      where: eq(payments.appointmentId, appointmentId),
    });
    expect(payRow?.status).toBe("released");

    // 6. Patient reviews
    const review = await request(app)
      .post(`/api/appointments/${appointmentId}/review`)
      .set("Authorization", bearer(patient))
      .send({ rating: 5, comment: "Top notch." });
    expect(review.status).toBe(201);

    // 7. Public reviews list reflects it
    const pub = await request(app).get(`/api/doctors/${profileId}/reviews`);
    expect(pub.status).toBe(200);
    expect(pub.body.data.total).toBe(1);
    expect(pub.body.data.reviews[0].rating).toBe(5);

    // 8. Doctor's average_rating updated
    const updatedProfile = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.id, profileId),
    });
    expect(Number(updatedProfile?.averageRating)).toBe(5);

    // sanity: reviews table holds the row
    const reviewRows = await db
      .select()
      .from(reviews)
      .where(eq(reviews.doctorId, docSession.userId));
    expect(reviewRows).toHaveLength(1);
  });
});

describe("Golden path: admin verifies → patient books", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("unverified doctor becomes bookable after admin flips the flag", async () => {
    const admin = await registerAdmin("golden-admin@example.com");
    const { profileId } = await setupDoctor(
      "golden-unverif@example.com",
      false,
    );

    // Public list excludes them
    const before = await request(app).get("/api/doctors");
    expect(before.body.data.total).toBe(0);

    // Admin verifies
    const verify = await request(app)
      .patch(`/api/admin/doctors/${profileId}/verify`)
      .set("Authorization", bearer(admin))
      .send({ isVerified: true });
    expect(verify.status).toBe(200);

    // Public list now includes them
    const after = await request(app).get("/api/doctors");
    expect(after.body.data.total).toBe(1);

    // Patient can book
    const date = nextDate(2);
    const dow = manilaDateDayOfWeek(date);
    await db.insert(doctorSchedules).values({
      doctorId: profileId,
      dayOfWeek: dow,
      startTime: "09:00",
      endTime: "12:00",
      isActive: true,
    });

    const patient = await registerPatient("golden-verif-p@example.com");
    const book = await request(app)
      .post("/api/appointments")
      .set("Authorization", bearer(patient))
      .send({
        doctorId: profileId,
        appointmentDate: date,
        slotStart: "09:00",
        slotEnd: "09:30",
      });
    expect(book.status).toBe(201);
  });
});

describe("Golden path: cancel after pay → refund", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("paid appointment cancellation flips payment to refunded", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "golden-cancel-doc@example.com",
    );
    const date = nextDate(3);
    const dow = manilaDateDayOfWeek(date);
    await db.insert(doctorSchedules).values({
      doctorId: profileId,
      dayOfWeek: dow,
      startTime: "09:00",
      endTime: "12:00",
      isActive: true,
    });

    const patient = await registerPatient("golden-cancel-p@example.com");
    const book = await request(app)
      .post("/api/appointments")
      .set("Authorization", bearer(patient))
      .send({
        doctorId: profileId,
        appointmentDate: date,
        slotStart: "09:00",
        slotEnd: "09:30",
      });
    const appointmentId = book.body.data.appointment.id as string;

    await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "confirmed" });
    await confirmPayment(appointmentId, patient);

    await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "cancelled" });

    const payRow = await db.query.payments.findFirst({
      where: eq(payments.appointmentId, appointmentId),
    });
    expect(payRow?.status).toBe("refunded");
    expect(payRow?.refundedAt).toBeTruthy();
  });
});
