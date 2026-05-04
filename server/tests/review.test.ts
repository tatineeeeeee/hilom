import request from "supertest";
import { eq } from "drizzle-orm";
import { app } from "../src/app";
import { db } from "../src/config/db";
import { doctorProfiles, doctorSchedules } from "../src/db/schema";
import { seedTestSpecializations } from "./helpers/seedSpecializations";
import { bearer, registerDoctor, registerPatient } from "./helpers/auth";
import type { TestSession } from "./helpers/auth";
import { confirmPayment } from "./helpers/payment";
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
  await confirmPayment(id, patientSession);
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

describe("GET /api/doctors/:id/reviews", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  const setupDoctorByEmail = async (email: string) => {
    const specId = await getSpecId("General Practice");
    const session = await registerDoctor(email);
    await request(app)
      .put("/api/me/profile")
      .set("Authorization", bearer(session))
      .send({
        specializationId: specId,
        bio: "Public reviews test doctor.",
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

  const seedPaidReview = async (
    patient: TestSession,
    docSession: TestSession,
    profileId: string,
    date: string,
    slotStart: string,
    slotEnd: string,
    rating: number,
    comment: string,
  ) => {
    const id = await createCompletedAppointment(
      patient,
      docSession,
      profileId,
      date,
      slotStart,
      slotEnd,
    );
    await request(app)
      .post(`/api/appointments/${id}/review`)
      .set("Authorization", bearer(patient))
      .send({ rating, comment });
  };

  it("returns 200 with reviews ordered by createdAt DESC", async () => {
    const { session: docSession, profileId } = await setupDoctorByEmail(
      "pub-list-ok@example.com",
    );
    const date = nextDate(1);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "18:00" },
    ]);

    const p1 = await registerPatient("pub-list-ok-p1@example.com");
    const p2 = await registerPatient("pub-list-ok-p2@example.com");
    const p3 = await registerPatient("pub-list-ok-p3@example.com");
    await seedPaidReview(
      p1,
      docSession,
      profileId,
      date,
      "09:00",
      "09:30",
      5,
      "first",
    );
    await seedPaidReview(
      p2,
      docSession,
      profileId,
      date,
      "09:30",
      "10:00",
      4,
      "second",
    );
    await seedPaidReview(
      p3,
      docSession,
      profileId,
      date,
      "10:00",
      "10:30",
      3,
      "third",
    );

    const res = await request(app).get(`/api/doctors/${profileId}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body.data.reviews).toHaveLength(3);
    expect(res.body.data.total).toBe(3);
    const comments = res.body.data.reviews.map(
      (r: { comment: string }) => r.comment,
    );
    expect(comments[0]).toBe("third");
    expect(comments[2]).toBe("first");
  });

  it("returns aggregate averageRating and ratingCount", async () => {
    const { session: docSession, profileId } = await setupDoctorByEmail(
      "pub-list-agg@example.com",
    );
    const date = nextDate(2);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "18:00" },
    ]);

    const p1 = await registerPatient("pub-list-agg-p1@example.com");
    const p2 = await registerPatient("pub-list-agg-p2@example.com");
    await seedPaidReview(
      p1,
      docSession,
      profileId,
      date,
      "09:00",
      "09:30",
      5,
      "ok",
    );
    await seedPaidReview(
      p2,
      docSession,
      profileId,
      date,
      "09:30",
      "10:00",
      3,
      "ok",
    );

    const res = await request(app).get(`/api/doctors/${profileId}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body.data.ratingCount).toBe(2);
    expect(Number(res.body.data.averageRating)).toBe(4);
  });

  it("paginates with page size 10", async () => {
    const { session: docSession, profileId } = await setupDoctorByEmail(
      "pub-list-page@example.com",
    );
    const date = nextDate(3);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "18:00" },
    ]);

    const total = 12;
    for (let i = 0; i < total; i++) {
      const p = await registerPatient(`pub-list-page-p${i}@example.com`);
      const minute = i * 30;
      const startH = 9 + Math.floor(minute / 60);
      const startM = minute % 60;
      const endTotal = minute + 30;
      const endH = 9 + Math.floor(endTotal / 60);
      const endM = endTotal % 60;
      const pad = (n: number) => n.toString().padStart(2, "0");
      await seedPaidReview(
        p,
        docSession,
        profileId,
        date,
        `${pad(startH)}:${pad(startM)}`,
        `${pad(endH)}:${pad(endM)}`,
        4,
        `n-${i}`,
      );
    }

    const page1 = await request(app).get(
      `/api/doctors/${profileId}/reviews?page=1`,
    );
    expect(page1.body.data.reviews).toHaveLength(10);
    expect(page1.body.data.total).toBe(12);

    const page2 = await request(app).get(
      `/api/doctors/${profileId}/reviews?page=2`,
    );
    expect(page2.body.data.reviews).toHaveLength(2);
  });

  it("requires no auth", async () => {
    const { session: docSession, profileId } = await setupDoctorByEmail(
      "pub-list-noauth@example.com",
    );
    const date = nextDate(4);
    const dow = manilaDateDayOfWeek(date);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const p = await registerPatient("pub-list-noauth-p@example.com");
    await seedPaidReview(
      p,
      docSession,
      profileId,
      date,
      "09:00",
      "09:30",
      5,
      "yo",
    );

    const res = await request(app).get(`/api/doctors/${profileId}/reviews`);
    expect(res.status).toBe(200);
  });

  it("returns 404 for an unknown doctor profile id", async () => {
    const randomId = "00000000-0000-0000-0000-000000000000";
    const res = await request(app).get(`/api/doctors/${randomId}/reviews`);
    expect(res.status).toBe(404);
  });
});
