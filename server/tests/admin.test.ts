import request from "supertest";
import { eq } from "drizzle-orm";
import { app } from "../src/app";
import { db } from "../src/config/db";
import {
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
  verified = false,
): Promise<{ session: TestSession; profileId: string }> => {
  const specId = await getSpecId("General Practice");
  const session = await registerDoctor(email);
  await request(app)
    .put("/api/me/profile")
    .set("Authorization", bearer(session))
    .send({
      specializationId: specId,
      bio: "Admin test doctor.",
      yearsOfExperience: 5,
      consultationFee: 1500,
      slotDurationMinutes: 30,
    });
  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, session.userId),
  });
  if (!profile) throw new Error("Doctor profile not found after setup");
  if (verified) {
    await db
      .update(doctorProfiles)
      .set({ isVerified: true })
      .where(eq(doctorProfiles.id, profile.id));
  }
  return { session, profileId: profile.id };
};

describe("admin guard", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("rejects patient with 403 on every admin endpoint", async () => {
    const patient = await registerPatient("admin-403-p@example.com");
    const paths = [
      "/api/admin/users",
      "/api/admin/doctors/unverified",
      "/api/admin/stats",
    ];
    for (const path of paths) {
      const res = await request(app)
        .get(path)
        .set("Authorization", bearer(patient));
      expect(res.status).toBe(403);
    }
  });

  it("rejects doctor with 403", async () => {
    const { session } = await setupDoctor("admin-403-doc@example.com");
    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", bearer(session));
    expect(res.status).toBe(403);
  });

  it("rejects unauthenticated with 401", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/admin/users", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("lists users with role filter", async () => {
    const admin = await registerAdmin("admin-list@example.com");
    await registerPatient("admin-list-p1@example.com");
    await registerPatient("admin-list-p2@example.com");
    await setupDoctor("admin-list-doc@example.com");

    const all = await request(app)
      .get("/api/admin/users")
      .set("Authorization", bearer(admin));
    expect(all.status).toBe(200);
    expect(all.body.data.total).toBeGreaterThanOrEqual(4);

    const onlyDoctors = await request(app)
      .get("/api/admin/users?role=doctor")
      .set("Authorization", bearer(admin));
    expect(onlyDoctors.status).toBe(200);
    expect(onlyDoctors.body.data.total).toBe(1);
    expect(onlyDoctors.body.data.rows[0].role).toBe("doctor");
  });
});

describe("GET /api/admin/doctors/unverified", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("returns only unverified doctors", async () => {
    const admin = await registerAdmin("admin-unverif@example.com");
    await setupDoctor("admin-unverif-y1@example.com", true);
    await setupDoctor("admin-unverif-y2@example.com", true);
    await setupDoctor("admin-unverif-n@example.com", false);

    const res = await request(app)
      .get("/api/admin/doctors/unverified")
      .set("Authorization", bearer(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.rows[0].email).toBe("admin-unverif-n@example.com");
  });
});

describe("PATCH /api/admin/doctors/:id/verify", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("flips is_verified true and exposes the doctor in the public list", async () => {
    const admin = await registerAdmin("admin-verify-yes@example.com");
    const { profileId } = await setupDoctor("admin-verify-doc@example.com");

    const before = await request(app).get("/api/doctors");
    expect(before.body.data.total).toBe(0);

    const verify = await request(app)
      .patch(`/api/admin/doctors/${profileId}/verify`)
      .set("Authorization", bearer(admin))
      .send({ isVerified: true });
    expect(verify.status).toBe(200);
    expect(verify.body.data.doctor.isVerified).toBe(true);

    const after = await request(app).get("/api/doctors");
    expect(after.body.data.total).toBe(1);
  });

  it("can flip back to false to hide a doctor again", async () => {
    const admin = await registerAdmin("admin-verify-no@example.com");
    const { profileId } = await setupDoctor(
      "admin-verify-no-doc@example.com",
      true,
    );

    const beforeFlip = await request(app).get("/api/doctors");
    expect(beforeFlip.body.data.total).toBe(1);

    const reject = await request(app)
      .patch(`/api/admin/doctors/${profileId}/verify`)
      .set("Authorization", bearer(admin))
      .send({ isVerified: false });
    expect(reject.status).toBe(200);
    expect(reject.body.data.doctor.isVerified).toBe(false);

    const after = await request(app).get("/api/doctors");
    expect(after.body.data.total).toBe(0);
  });

  it("returns 404 for an unknown doctor id", async () => {
    const admin = await registerAdmin("admin-verify-404@example.com");
    const res = await request(app)
      .patch("/api/admin/doctors/00000000-0000-0000-0000-000000000000/verify")
      .set("Authorization", bearer(admin))
      .send({ isVerified: true });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/admin/stats", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("returns the expected shape and counts", async () => {
    const admin = await registerAdmin("admin-stats@example.com");
    await registerPatient("admin-stats-p1@example.com");
    await registerPatient("admin-stats-p2@example.com");
    await setupDoctor("admin-stats-doc1@example.com", true);
    await setupDoctor("admin-stats-doc2@example.com");

    const res = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", bearer(admin));
    expect(res.status).toBe(200);

    const stats = res.body.data.stats;
    expect(stats.users.total).toBeGreaterThanOrEqual(5);
    expect(stats.users.patients).toBeGreaterThanOrEqual(2);
    expect(stats.users.doctors).toBeGreaterThanOrEqual(2);
    expect(stats.users.admins).toBeGreaterThanOrEqual(1);
    expect(stats.appointments).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        pending: expect.any(Number),
        confirmed: expect.any(Number),
        completed: expect.any(Number),
        cancelled: expect.any(Number),
      }),
    );
    expect(stats.revenue).toEqual(
      expect.objectContaining({
        released: expect.any(String),
        escrowed: expect.any(String),
      }),
    );
    expect(stats.doctors.unverified).toBeGreaterThanOrEqual(1);
  });

  it("revenue.released sums payments where status is released", async () => {
    const admin = await registerAdmin("admin-rev@example.com");
    const { session: docSession, profileId } = await setupDoctor(
      "admin-rev-doc@example.com",
      true,
    );
    const date = nextDate(1);
    const dow = manilaDateDayOfWeek(date);
    await db.insert(doctorSchedules).values({
      doctorId: profileId,
      dayOfWeek: dow,
      startTime: "09:00",
      endTime: "18:00",
      isActive: true,
    });

    const patient1 = await registerPatient("admin-rev-p1@example.com");
    const patient2 = await registerPatient("admin-rev-p2@example.com");

    const completePaid = async (
      patient: TestSession,
      slotStart: string,
      slotEnd: string,
    ) => {
      const book = await request(app)
        .post("/api/appointments")
        .set("Authorization", bearer(patient))
        .send({
          doctorId: profileId,
          appointmentDate: date,
          slotStart,
          slotEnd,
        });
      const id = book.body.data.appointment.id as string;
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

    await completePaid(patient1, "09:00", "09:30");
    await completePaid(patient2, "09:30", "10:00");

    const releasedRows = await db
      .select({ amount: payments.amount })
      .from(payments)
      .where(eq(payments.status, "released"));
    const expectedSum = releasedRows
      .reduce((acc, r) => acc + Number(r.amount), 0)
      .toFixed(2);

    const res = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", bearer(admin));

    expect(Number(res.body.data.stats.revenue.released).toFixed(2)).toBe(
      expectedSum,
    );
  });
});
