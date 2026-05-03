import request from "supertest";
import { eq } from "drizzle-orm";
import { app } from "../src/app";
import { db } from "../src/config/db";
import { doctorProfiles, doctorSchedules } from "../src/db/schema";
import { seedTestSpecializations } from "./helpers/seedSpecializations";
import { bearer, registerDoctor, registerPatient } from "./helpers/auth";
import type { TestSession } from "./helpers/auth";
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
      bio: "Review test doctor.",
      yearsOfExperience: 5,
      consultationFee: 1000,
      slotDurationMinutes: 30,
    });
  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, session.userId),
  });
  if (!profile) throw new Error("Doctor profile not found after setup");
  return { session, profileId: profile.id };
};

const seedSchedule = async (
  doctorId: string,
  entries: { dayOfWeek: number; startTime: string; endTime: string }[],
) => {
  await db
    .insert(doctorSchedules)
    .values(entries.map((e) => ({ doctorId, ...e, isActive: true })));
};

/** Books → confirms → completes, returns appointmentId */
const createCompletedAppointment = async (
  patientSession: TestSession,
  doctorSession: TestSession,
  profileId: string,
  date: string,
  slotStart: string,
  slotEnd: string,
): Promise<string> => {
  const bookRes = await request(app)
    .post("/api/appointments")
    .set("Authorization", bearer(patientSession))
    .send({ doctorId: profileId, appointmentDate: date, slotStart, slotEnd });
  if (bookRes.status !== 201) {
    throw new Error(
      `Booking failed: ${bookRes.status} ${JSON.stringify(bookRes.body)}`,
    );
  }
  const id = bookRes.body.data.appointment.id as string;

  await request(app)
    .patch(`/api/appointments/${id}/status`)
    .set("Authorization", bearer(doctorSession))
    .send({ status: "confirmed" });
  await request(app)
    .patch(`/api/appointments/${id}/status`)
    .set("Authorization", bearer(doctorSession))
    .send({ status: "completed" });

  return id;
};

describe("POST /api/appointments/:id/review", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("patient reviews a completed appointment and doctor averageRating updates", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "review-ok@example.com",
    );
    const testDate = nextDate(3);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("review-ok-p@example.com");
    const appointmentId = await createCompletedAppointment(
      patient,
      docSession,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );

    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/review`)
      .set("Authorization", bearer(patient))
      .send({ rating: 5, comment: "Great doctor!" });

    expect(res.status).toBe(201);
    expect(res.body.data.review.rating).toBe(5);

    // Check averageRating updated
    const profile = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.id, profileId),
    });
    expect(Number(profile?.averageRating)).toBe(5);
  });

  it("returns 409 when already reviewed", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "review-dup@example.com",
    );
    const testDate = nextDate(4);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("review-dup-p@example.com");
    const appointmentId = await createCompletedAppointment(
      patient,
      docSession,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );

    await request(app)
      .post(`/api/appointments/${appointmentId}/review`)
      .set("Authorization", bearer(patient))
      .send({ rating: 4 });

    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/review`)
      .set("Authorization", bearer(patient))
      .send({ rating: 3 });

    expect(res.status).toBe(409);
  });

  it("returns 403 when wrong patient tries to review", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "review-wrong@example.com",
    );
    const testDate = nextDate(5);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("review-wrong-p1@example.com");
    const otherPatient = await registerPatient("review-wrong-p2@example.com");
    const appointmentId = await createCompletedAppointment(
      patient,
      docSession,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );

    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/review`)
      .set("Authorization", bearer(otherPatient))
      .send({ rating: 4 });

    expect(res.status).toBe(403);
  });

  it("returns 400 when appointment is not completed", async () => {
    const { profileId } = await setupDoctor("review-notdone@example.com");
    const testDate = nextDate(6);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("review-notdone-p@example.com");

    // Book but don't confirm/complete
    const bookRes = await request(app)
      .post("/api/appointments")
      .set("Authorization", bearer(patient))
      .send({
        doctorId: profileId,
        appointmentDate: testDate,
        slotStart: "09:00",
        slotEnd: "09:30",
      });
    const appointmentId = bookRes.body.data.appointment.id as string;

    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/review`)
      .set("Authorization", bearer(patient))
      .send({ rating: 5 });

    expect(res.status).toBe(400);
  });

  it("averageRating recalculates correctly with multiple reviews", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "review-avg@example.com",
    );
    const testDate = nextDate(1);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);

    const patient1 = await registerPatient("review-avg-p1@example.com");
    const patient2 = await registerPatient("review-avg-p2@example.com");

    const id1 = await createCompletedAppointment(
      patient1,
      docSession,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );
    const id2 = await createCompletedAppointment(
      patient2,
      docSession,
      profileId,
      testDate,
      "09:30",
      "10:00",
    );

    await request(app)
      .post(`/api/appointments/${id1}/review`)
      .set("Authorization", bearer(patient1))
      .send({ rating: 4 });

    await request(app)
      .post(`/api/appointments/${id2}/review`)
      .set("Authorization", bearer(patient2))
      .send({ rating: 2 });

    const profile = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.id, profileId),
    });
    expect(Number(profile?.averageRating)).toBe(3);
  });
});
