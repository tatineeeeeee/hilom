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

/** Returns a future date string for the next occurrence of `dow` (0=Sun…6=Sat) */
const nextDate = (dow: number): string => {
  const today = todayInManila();
  const todayDow = manilaDateDayOfWeek(today);
  const daysAhead = (dow - todayDow + 7) % 7 || 7;
  return addDaysToManilaDate(today, daysAhead);
};

interface DoctorFixture {
  session: TestSession;
  profileId: string;
}

const setupDoctor = async (
  email: string,
  slotDuration = 30,
): Promise<DoctorFixture> => {
  const specId = await getSpecId("General Practice");
  const session = await registerDoctor(email);
  await request(app)
    .put("/api/me/profile")
    .set("Authorization", bearer(session))
    .send({
      specializationId: specId,
      bio: "Appointment test doctor.",
      yearsOfExperience: 5,
      consultationFee: 1000,
      slotDurationMinutes: slotDuration,
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

describe("POST /api/appointments", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("books successfully and returns 201 with pending status", async () => {
    const { profileId } = await setupDoctor("appt-book@example.com");
    const testDate = nextDate(3); // Wednesday
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "11:00" },
    ]);

    const patient = await registerPatient("patient-book@example.com");

    const res = await request(app)
      .post("/api/appointments")
      .set("Authorization", bearer(patient))
      .send({
        doctorId: profileId,
        appointmentDate: testDate,
        slotStart: "09:00",
        slotEnd: "09:30",
        reason: "Regular checkup",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.appointment.status).toBe("pending");
    expect(res.body.data.appointment.reason).toBe("Regular checkup");
  });

  it("returns 409 on double-book of the same slot", async () => {
    const { profileId } = await setupDoctor("appt-dbl@example.com");
    const testDate = nextDate(4); // Thursday
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "11:00" },
    ]);

    const patient1 = await registerPatient("patient-dbl1@example.com");
    const patient2 = await registerPatient("patient-dbl2@example.com");

    const firstBooking = await request(app)
      .post("/api/appointments")
      .set("Authorization", bearer(patient1))
      .send({
        doctorId: profileId,
        appointmentDate: testDate,
        slotStart: "09:00",
        slotEnd: "09:30",
      });
    expect(firstBooking.status).toBe(201);

    const secondBooking = await request(app)
      .post("/api/appointments")
      .set("Authorization", bearer(patient2))
      .send({
        doctorId: profileId,
        appointmentDate: testDate,
        slotStart: "09:00",
        slotEnd: "09:30",
      });
    expect(secondBooking.status).toBe(409);
  });

  it("returns 409 for a slot not in the doctor's schedule", async () => {
    const { profileId } = await setupDoctor("appt-nosched@example.com");
    const testDate = nextDate(5); // Friday
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "11:00" },
    ]);

    const patient = await registerPatient("patient-nosched@example.com");

    const res = await request(app)
      .post("/api/appointments")
      .set("Authorization", bearer(patient))
      .send({
        doctorId: profileId,
        appointmentDate: testDate,
        slotStart: "14:00",
        slotEnd: "14:30",
      });
    expect(res.status).toBe(409);
  });

  it("returns 409 for a past date", async () => {
    const { profileId } = await setupDoctor("appt-past@example.com");
    const patient = await registerPatient("patient-past@example.com");

    const res = await request(app)
      .post("/api/appointments")
      .set("Authorization", bearer(patient))
      .send({
        doctorId: profileId,
        appointmentDate: "2020-01-06",
        slotStart: "09:00",
        slotEnd: "09:30",
      });
    expect(res.status).toBe(409);
  });

  it("returns 403 when a doctor tries to book", async () => {
    const { session, profileId } = await setupDoctor(
      "appt-docbook@example.com",
    );
    const testDate = nextDate(1);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "11:00" },
    ]);

    const res = await request(app)
      .post("/api/appointments")
      .set("Authorization", bearer(session))
      .send({
        doctorId: profileId,
        appointmentDate: testDate,
        slotStart: "09:00",
        slotEnd: "09:30",
      });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/appointments", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("returns patient appointment list", async () => {
    const { profileId } = await setupDoctor("appt-list@example.com");
    const testDate = nextDate(2);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);

    const patient = await registerPatient("patient-list@example.com");

    await request(app)
      .post("/api/appointments")
      .set("Authorization", bearer(patient))
      .send({
        doctorId: profileId,
        appointmentDate: testDate,
        slotStart: "09:00",
        slotEnd: "09:30",
      });

    await request(app)
      .post("/api/appointments")
      .set("Authorization", bearer(patient))
      .send({
        doctorId: profileId,
        appointmentDate: testDate,
        slotStart: "09:30",
        slotEnd: "10:00",
      });

    const res = await request(app)
      .get("/api/appointments")
      .set("Authorization", bearer(patient));

    expect(res.status).toBe(200);
    expect(res.body.data.appointments).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.appointments[0].doctorName).toBeTruthy();
    expect(res.body.data.appointments[0].specializationName).toBeTruthy();
  });

  it("paginates correctly", async () => {
    const { profileId } = await setupDoctor("appt-page@example.com");

    // Schedule every day of the week with long hours to fit 11 slots
    const entries = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
      dayOfWeek: dow,
      startTime: "06:00",
      endTime: "23:00",
    }));
    await seedSchedule(profileId, entries);

    const patient = await registerPatient("patient-page@example.com");

    // Book 11 appointments across multiple dates
    for (let i = 0; i < 11; i++) {
      const dayOffset = Math.floor(i / 4);
      const slotIndex = i % 4;
      const date = addDaysToManilaDate(todayInManila(), dayOffset + 1);
      const startHour = 6 + slotIndex;
      const slotStart = `${String(startHour).padStart(2, "0")}:00`;
      const slotEnd = `${String(startHour).padStart(2, "0")}:30`;

      const bookRes = await request(app)
        .post("/api/appointments")
        .set("Authorization", bearer(patient))
        .send({
          doctorId: profileId,
          appointmentDate: date,
          slotStart,
          slotEnd,
        });
      if (bookRes.status !== 201) {
        throw new Error(
          `Booking ${i} failed: ${bookRes.status} ${JSON.stringify(bookRes.body)}`,
        );
      }
    }

    const page1 = await request(app)
      .get("/api/appointments?page=1")
      .set("Authorization", bearer(patient));
    expect(page1.status).toBe(200);
    expect(page1.body.data.appointments).toHaveLength(10);
    expect(page1.body.data.total).toBe(11);

    const page2 = await request(app)
      .get("/api/appointments?page=2")
      .set("Authorization", bearer(patient));
    expect(page2.status).toBe(200);
    expect(page2.body.data.appointments).toHaveLength(1);
  });
});

/** Helper: books a slot and returns the appointment id */
const bookSlot = async (
  patientSession: TestSession,
  doctorProfileId: string,
  date: string,
  slotStart: string,
  slotEnd: string,
): Promise<string> => {
  const res = await request(app)
    .post("/api/appointments")
    .set("Authorization", bearer(patientSession))
    .send({
      doctorId: doctorProfileId,
      appointmentDate: date,
      slotStart,
      slotEnd,
    });
  if (res.status !== 201) {
    throw new Error(
      `bookSlot failed: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
  return res.body.data.appointment.id as string;
};

describe("PATCH /api/appointments/:id/status", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("doctor confirms a pending appointment", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "status-confirm@example.com",
    );
    const testDate = nextDate(3);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("status-confirm-p@example.com");
    const appointmentId = await bookSlot(
      patient,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );

    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "confirmed" });

    expect(res.status).toBe(200);
    expect(res.body.data.appointment.status).toBe("confirmed");
  });

  it("doctor completes a confirmed appointment", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "status-complete@example.com",
    );
    const testDate = nextDate(4);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("status-complete-p@example.com");
    const appointmentId = await bookSlot(
      patient,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );

    // First confirm
    await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "confirmed" });

    // Then complete
    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "completed" });

    expect(res.status).toBe(200);
    expect(res.body.data.appointment.status).toBe("completed");
  });

  it("patient cancels a pending appointment", async () => {
    const { profileId } = await setupDoctor("status-cancel@example.com");
    const testDate = nextDate(5);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("status-cancel-p@example.com");
    const appointmentId = await bookSlot(
      patient,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );

    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(patient))
      .send({ status: "cancelled" });

    expect(res.status).toBe(200);
    expect(res.body.data.appointment.status).toBe("cancelled");
  });

  it("patient cannot confirm — returns 409", async () => {
    const { profileId } = await setupDoctor("status-noconfirm@example.com");
    const testDate = nextDate(1);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("status-noconfirm-p@example.com");
    const appointmentId = await bookSlot(
      patient,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );

    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(patient))
      .send({ status: "confirmed" });

    expect(res.status).toBe(409);
  });

  it("cannot cancel a completed appointment — returns 409", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "status-nocancelcomplete@example.com",
    );
    const testDate = nextDate(2);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient(
      "status-nocancelcomplete-p@example.com",
    );
    const appointmentId = await bookSlot(
      patient,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );

    await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "confirmed" });
    await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "completed" });

    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "cancelled" });

    expect(res.status).toBe(409);
  });

  it("doctor A cannot update doctor B's appointment — returns 403", async () => {
    const { profileId: profileA } = await setupDoctor(
      "status-wrongdoc-a@example.com",
    );
    const { session: docB } = await setupDoctor(
      "status-wrongdoc-b@example.com",
    );
    const testDate = nextDate(6);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileA, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("status-wrongdoc-p@example.com");
    const appointmentId = await bookSlot(
      patient,
      profileA,
      testDate,
      "09:00",
      "09:30",
    );

    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docB))
      .send({ status: "confirmed" });

    expect(res.status).toBe(403);
  });
});

describe("GET /api/me/doctor-appointments", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("returns the doctor's appointment list", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "doclist@example.com",
    );
    const testDate = nextDate(3);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("doclist-p@example.com");
    await bookSlot(patient, profileId, testDate, "09:00", "09:30");
    await bookSlot(patient, profileId, testDate, "09:30", "10:00");

    const res = await request(app)
      .get("/api/me/doctor-appointments")
      .set("Authorization", bearer(docSession));

    expect(res.status).toBe(200);
    expect(res.body.data.appointments).toHaveLength(2);
    expect(res.body.data.appointments[0].patientName).toBeTruthy();
  });
});
