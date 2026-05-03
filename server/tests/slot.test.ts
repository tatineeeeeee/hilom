import request from "supertest";
import { eq } from "drizzle-orm";
import { app } from "../src/app";
import { db } from "../src/config/db";
import {
  doctorProfiles,
  doctorSchedules,
  appointments,
  specializations,
} from "../src/db/schema";
import { seedTestSpecializations } from "./helpers/seedSpecializations";
import { bearer, registerDoctor } from "./helpers/auth";
import type { TestSession } from "./helpers/auth";
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

/** Returns a date string for the next occurrence of `dow` (0=Sun…6=Sat), ≥1 day ahead */
const nextDate = (dow: number): string => {
  const today = todayInManila();
  const todayDow = manilaDateDayOfWeek(today);
  const daysAhead = (dow - todayDow + 7) % 7 || 7;
  return addDaysToManilaDate(today, daysAhead);
};

const setupDoctor = async (
  email: string,
  slotDuration = 30,
): Promise<{ session: TestSession; profileId: string }> => {
  const specId = await getSpecId("General Practice");
  const session = await registerDoctor(email);
  await request(app)
    .put("/api/me/profile")
    .set("Authorization", bearer(session))
    .send({
      specializationId: specId,
      bio: "Slot test doctor.",
      yearsOfExperience: 3,
      consultationFee: 1000,
      slotDurationMinutes: slotDuration,
    });
  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, session.userId),
  });
  if (!profile) throw new Error("Profile not found after setup");
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

const seedAppointment = async (
  doctorId: string,
  date: string,
  slotStart: string,
  slotEnd: string,
  status: "pending" | "confirmed" | "completed" | "cancelled" = "pending",
) => {
  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.id, doctorId),
  });
  if (!profile) throw new Error("Doctor profile not found");
  await db.insert(appointments).values({
    patientId: profile.userId,
    doctorId,
    appointmentDate: date,
    slotStart,
    slotEnd,
    status,
  });
};

describe("GET /api/doctors/:id/slots", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("returns empty slots when no schedule for that day-of-week", async () => {
    const { profileId } = await setupDoctor("slots-empty@example.com");
    // Only add Mon (1); test with Sat (6)
    const monDate = nextDate(1);
    const satDate = nextDate(6);
    await seedSchedule(profileId, [
      { dayOfWeek: 1, startTime: "09:00", endTime: "11:00" },
    ]);

    const res = await request(app).get(
      `/api/doctors/${profileId}/slots?date=${satDate}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.slots).toHaveLength(0);
    void monDate; // only Saturday is used
  });

  it("respects slot duration (30 min, 60 min, partial window)", async () => {
    const mon = nextDate(1);
    const { profileId: id30 } = await setupDoctor("slots-30@example.com", 30);
    const { profileId: id60 } = await setupDoctor("slots-60@example.com", 60);
    const { profileId: idPartial } = await setupDoctor(
      "slots-partial@example.com",
      30,
    );

    // 09:00–11:00 with 30 min → 4 slots
    await seedSchedule(id30, [
      {
        dayOfWeek: manilaDateDayOfWeek(mon),
        startTime: "09:00",
        endTime: "11:00",
      },
    ]);
    const r30 = await request(app).get(
      `/api/doctors/${id30}/slots?date=${mon}`,
    );
    expect(r30.status).toBe(200);
    expect(r30.body.data.slots).toHaveLength(4);
    expect(r30.body.data.slots[0]).toEqual({ start: "09:00", end: "09:30" });

    // 09:00–11:00 with 60 min → 2 slots
    await seedSchedule(id60, [
      {
        dayOfWeek: manilaDateDayOfWeek(mon),
        startTime: "09:00",
        endTime: "11:00",
      },
    ]);
    const r60 = await request(app).get(
      `/api/doctors/${id60}/slots?date=${mon}`,
    );
    expect(r60.status).toBe(200);
    expect(r60.body.data.slots).toHaveLength(2);

    // 09:00–10:45 with 30 min → 3 slots (10:30–11:00 partial dropped)
    await seedSchedule(idPartial, [
      {
        dayOfWeek: manilaDateDayOfWeek(mon),
        startTime: "09:00",
        endTime: "10:45",
      },
    ]);
    const rPartial = await request(app).get(
      `/api/doctors/${idPartial}/slots?date=${mon}`,
    );
    expect(rPartial.status).toBe(200);
    expect(rPartial.body.data.slots).toHaveLength(3);
    expect(rPartial.body.data.slots[2]).toEqual({
      start: "10:00",
      end: "10:30",
    });
  });

  it("excludes booked (pending/confirmed) slots but keeps cancelled ones", async () => {
    const { profileId } = await setupDoctor("slots-booked@example.com", 30);
    const testDate = nextDate(2); // Tuesday
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "11:00" },
    ]);

    await seedAppointment(profileId, testDate, "09:30", "10:00", "pending");
    await seedAppointment(profileId, testDate, "10:30", "11:00", "confirmed");
    await seedAppointment(profileId, testDate, "10:00", "10:30", "cancelled");

    const res = await request(app).get(
      `/api/doctors/${profileId}/slots?date=${testDate}`,
    );
    expect(res.status).toBe(200);
    const slots = res.body.data.slots as Array<{ start: string; end: string }>;
    // Available: 09:00–09:30, 10:00–10:30
    expect(slots).toHaveLength(2);
    expect(slots[0]).toEqual({ start: "09:00", end: "09:30" });
    expect(slots[1]).toEqual({ start: "10:00", end: "10:30" });
  });

  it("returns empty slots (not 400) for a past date", async () => {
    const { profileId } = await setupDoctor("slots-past@example.com");
    await seedSchedule(profileId, [
      { dayOfWeek: 1, startTime: "09:00", endTime: "11:00" },
    ]);

    const res = await request(app).get(
      `/api/doctors/${profileId}/slots?date=2020-01-06`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.slots).toHaveLength(0);
  });

  it("returns 400 for date >30 days, malformed date; and allows date+30 boundary", async () => {
    const { profileId } = await setupDoctor("slots-range@example.com");

    const badDate = await request(app).get(
      `/api/doctors/${profileId}/slots?date=2026-13-99`,
    );
    expect(badDate.status).toBe(400);

    const missing = await request(app).get(`/api/doctors/${profileId}/slots`);
    expect(missing.status).toBe(400);

    const today = todayInManila();
    const plus30 = addDaysToManilaDate(today, 30);
    const boundary = await request(app).get(
      `/api/doctors/${profileId}/slots?date=${plus30}`,
    );
    expect(boundary.status).toBe(200);

    const plus31 = addDaysToManilaDate(today, 31);
    const over = await request(app).get(
      `/api/doctors/${profileId}/slots?date=${plus31}`,
    );
    expect(over.status).toBe(400);
  });
});
