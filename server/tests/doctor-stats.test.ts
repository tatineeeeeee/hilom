import request from "supertest";
import { eq, sql } from "drizzle-orm";
import { app } from "../src/app";
import { db } from "../src/config/db";
import {
  appointments,
  doctorProfiles,
  doctorSchedules,
  payments,
  specializations,
} from "../src/db/schema";
import { seedTestSpecializations } from "./helpers/seedSpecializations";
import {
  bearer,
  registerDoctor,
  registerPatient,
  type TestSession,
} from "./helpers/auth";
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

const setupDoctor = async (
  email: string,
): Promise<{ session: TestSession; profileId: string }> => {
  const specId = await getSpecId("General Practice");
  const session = await registerDoctor(email);
  await request(app)
    .put("/api/me/profile")
    .set("Authorization", bearer(session))
    .send({
      specializationId: specId,
      bio: "Stats test doctor.",
      yearsOfExperience: 5,
      consultationFee: 1500,
      slotDurationMinutes: 30,
    });
  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, session.userId),
  });
  if (!profile) throw new Error("Doctor profile not found");
  return { session, profileId: profile.id };
};

describe("GET /api/me/doctor-stats", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/me/doctor-stats");
    expect(res.status).toBe(401);
  });

  it("returns 403 for a patient", async () => {
    const patient = await registerPatient("stats-403@example.com");
    const res = await request(app)
      .get("/api/me/doctor-stats")
      .set("Authorization", bearer(patient));
    expect(res.status).toBe(403);
  });

  it("returns the empty-state shape for a fresh doctor", async () => {
    const { session } = await setupDoctor("stats-empty@example.com");
    const res = await request(app)
      .get("/api/me/doctor-stats")
      .set("Authorization", bearer(session));

    expect(res.status).toBe(200);
    const stats = res.body.data.stats;
    expect(stats.todaySchedule).toEqual([]);
    expect(stats.pendingConfirmations).toBe(0);
    expect(Number(stats.earnings.last30Days)).toBe(0);
    expect(Number(stats.earnings.allTime)).toBe(0);
    expect(stats.rating.count).toBe(0);
  });

  it("today's schedule excludes other days", async () => {
    const { session, profileId } = await setupDoctor("stats-today@example.com");
    const today = todayInManila();
    const tomorrow = addDaysToManilaDate(today, 1);
    const todayDow = manilaDateDayOfWeek(today);
    const tomorrowDow = manilaDateDayOfWeek(tomorrow);
    await db.insert(doctorSchedules).values([
      {
        doctorId: profileId,
        dayOfWeek: todayDow,
        startTime: "00:00",
        endTime: "23:30",
        isActive: true,
      },
      {
        doctorId: profileId,
        dayOfWeek: tomorrowDow,
        startTime: "00:00",
        endTime: "23:30",
        isActive: true,
      },
    ]);

    const p1 = await registerPatient("stats-today-p1@example.com");
    const p2 = await registerPatient("stats-today-p2@example.com");

    await db.insert(appointments).values([
      {
        patientId: p1.userId,
        doctorId: profileId,
        appointmentDate: today,
        slotStart: "10:00",
        slotEnd: "10:30",
        status: "confirmed",
      },
      {
        patientId: p2.userId,
        doctorId: profileId,
        appointmentDate: tomorrow,
        slotStart: "10:00",
        slotEnd: "10:30",
        status: "confirmed",
      },
    ]);

    const res = await request(app)
      .get("/api/me/doctor-stats")
      .set("Authorization", bearer(session));
    expect(res.status).toBe(200);
    expect(res.body.data.stats.todaySchedule).toHaveLength(1);
  });

  it("today's schedule excludes cancelled but includes other statuses", async () => {
    const { session, profileId } = await setupDoctor(
      "stats-status@example.com",
    );
    const today = todayInManila();
    const todayDow = manilaDateDayOfWeek(today);
    await db.insert(doctorSchedules).values({
      doctorId: profileId,
      dayOfWeek: todayDow,
      startTime: "00:00",
      endTime: "23:30",
      isActive: true,
    });

    const p1 = await registerPatient("stats-status-p1@example.com");
    const p2 = await registerPatient("stats-status-p2@example.com");
    const p3 = await registerPatient("stats-status-p3@example.com");

    await db.insert(appointments).values([
      {
        patientId: p1.userId,
        doctorId: profileId,
        appointmentDate: today,
        slotStart: "08:00",
        slotEnd: "08:30",
        status: "pending",
      },
      {
        patientId: p2.userId,
        doctorId: profileId,
        appointmentDate: today,
        slotStart: "09:00",
        slotEnd: "09:30",
        status: "confirmed",
      },
      {
        patientId: p3.userId,
        doctorId: profileId,
        appointmentDate: today,
        slotStart: "10:00",
        slotEnd: "10:30",
        status: "cancelled",
      },
    ]);

    const res = await request(app)
      .get("/api/me/doctor-stats")
      .set("Authorization", bearer(session));
    expect(res.body.data.stats.todaySchedule).toHaveLength(2);
  });

  it("pendingConfirmations counts pending only", async () => {
    const { session, profileId } = await setupDoctor(
      "stats-pending@example.com",
    );
    const today = todayInManila();
    const todayDow = manilaDateDayOfWeek(today);
    await db.insert(doctorSchedules).values({
      doctorId: profileId,
      dayOfWeek: todayDow,
      startTime: "00:00",
      endTime: "23:30",
      isActive: true,
    });

    const patientIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const p = await registerPatient(`stats-pending-p${i}@example.com`);
      patientIds.push(p.userId);
    }

    await db.insert(appointments).values(
      patientIds.map((pid, i) => ({
        patientId: pid,
        doctorId: profileId,
        appointmentDate: today,
        slotStart: `${(8 + i).toString().padStart(2, "0")}:00`,
        slotEnd: `${(8 + i).toString().padStart(2, "0")}:30`,
        status: i < 3 ? ("pending" as const) : ("confirmed" as const),
      })),
    );

    const res = await request(app)
      .get("/api/me/doctor-stats")
      .set("Authorization", bearer(session));
    expect(res.body.data.stats.pendingConfirmations).toBe(3);
  });

  it("earnings.allTime sums released payments only", async () => {
    const { session, profileId } = await setupDoctor(
      "stats-earnings@example.com",
    );
    const bookDate = addDaysToManilaDate(todayInManila(), 1);
    const bookDow = manilaDateDayOfWeek(bookDate);
    await db.insert(doctorSchedules).values({
      doctorId: profileId,
      dayOfWeek: bookDow,
      startTime: "00:00",
      endTime: "23:30",
      isActive: true,
    });

    const docSession = session;
    const p1 = await registerPatient("stats-earnings-p1@example.com");
    const p2 = await registerPatient("stats-earnings-p2@example.com");

    const completePaid = async (patient: TestSession, slotStart: string) => {
      const slotEnd = slotStart.replace(":00", ":30");
      const book = await request(app)
        .post("/api/appointments")
        .set("Authorization", bearer(patient))
        .send({
          doctorId: profileId,
          appointmentDate: bookDate,
          slotStart,
          slotEnd,
        });
      const id = book.body.data.appointment.id;
      await request(app)
        .patch(`/api/appointments/${id}/status`)
        .set("Authorization", bearer(docSession))
        .send({ status: "confirmed" });
      await confirmPayment(id, patient);
      await request(app)
        .patch(`/api/appointments/${id}/status`)
        .set("Authorization", bearer(docSession))
        .send({ status: "completed" });
    };

    await completePaid(p1, "08:00");
    await completePaid(p2, "09:00");

    const res = await request(app)
      .get("/api/me/doctor-stats")
      .set("Authorization", bearer(session));
    expect(Number(res.body.data.stats.earnings.allTime)).toBe(3000);
  });

  it("earnings.last30Days excludes payments released > 30 days ago", async () => {
    const { session, profileId } = await setupDoctor("stats-30d@example.com");
    const docSession = session;
    const bookDate = addDaysToManilaDate(todayInManila(), 1);
    const bookDow = manilaDateDayOfWeek(bookDate);
    await db.insert(doctorSchedules).values({
      doctorId: profileId,
      dayOfWeek: bookDow,
      startTime: "00:00",
      endTime: "23:30",
      isActive: true,
    });

    const patient = await registerPatient("stats-30d-p@example.com");
    const book = await request(app)
      .post("/api/appointments")
      .set("Authorization", bearer(patient))
      .send({
        doctorId: profileId,
        appointmentDate: bookDate,
        slotStart: "08:00",
        slotEnd: "08:30",
      });
    const id = book.body.data.appointment.id;
    await request(app)
      .patch(`/api/appointments/${id}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "confirmed" });
    await confirmPayment(id, patient);
    await request(app)
      .patch(`/api/appointments/${id}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "completed" });

    // Backdate the released_at to 40 days ago
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setUTCDate(fortyDaysAgo.getUTCDate() - 40);
    await db
      .update(payments)
      .set({ releasedAt: fortyDaysAgo })
      .where(eq(payments.appointmentId, id));

    const res = await request(app)
      .get("/api/me/doctor-stats")
      .set("Authorization", bearer(session));
    expect(Number(res.body.data.stats.earnings.last30Days)).toBe(0);
    expect(Number(res.body.data.stats.earnings.allTime)).toBe(1500);
  });

  it("rating reflects doctor_profiles.average_rating + reviews count", async () => {
    const { session, profileId } = await setupDoctor(
      "stats-rating@example.com",
    );
    const docSession = session;
    const bookDate = addDaysToManilaDate(todayInManila(), 1);
    const bookDow = manilaDateDayOfWeek(bookDate);
    await db.insert(doctorSchedules).values({
      doctorId: profileId,
      dayOfWeek: bookDow,
      startTime: "00:00",
      endTime: "23:30",
      isActive: true,
    });

    const reviewers = [
      await registerPatient("stats-rating-r1@example.com"),
      await registerPatient("stats-rating-r2@example.com"),
    ];
    const ratings = [5, 3];
    for (let i = 0; i < reviewers.length; i++) {
      const patient = reviewers[i];
      const rating = ratings[i];
      if (!patient || rating === undefined) continue;
      const slot = `0${8 + i}:00`;
      const slotEnd = `0${8 + i}:30`;
      const book = await request(app)
        .post("/api/appointments")
        .set("Authorization", bearer(patient))
        .send({
          doctorId: profileId,
          appointmentDate: bookDate,
          slotStart: slot,
          slotEnd,
        });
      const id = book.body.data.appointment.id;
      await request(app)
        .patch(`/api/appointments/${id}/status`)
        .set("Authorization", bearer(docSession))
        .send({ status: "confirmed" });
      await confirmPayment(id, patient);
      await request(app)
        .patch(`/api/appointments/${id}/status`)
        .set("Authorization", bearer(docSession))
        .send({ status: "completed" });
      await request(app)
        .post(`/api/appointments/${id}/review`)
        .set("Authorization", bearer(patient))
        .send({ rating, comment: `c${i}` });
    }

    const res = await request(app)
      .get("/api/me/doctor-stats")
      .set("Authorization", bearer(session));
    expect(res.body.data.stats.rating.count).toBe(2);
    expect(Number(res.body.data.stats.rating.average)).toBe(4);
  });

  it("returns 404 if doctor profile is missing", async () => {
    // Doctor user registered but profile never created
    const session = await registerDoctor("stats-noprofile@example.com");
    // Force-delete any auto-profile (defensive)
    await db.execute(
      sql`DELETE FROM doctor_profiles WHERE user_id = ${session.userId}`,
    );

    const res = await request(app)
      .get("/api/me/doctor-stats")
      .set("Authorization", bearer(session));
    expect(res.status).toBe(404);
  });
});
