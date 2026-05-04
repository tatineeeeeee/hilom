import request from "supertest";
import { eq } from "drizzle-orm";
import { app } from "../src/app";
import { db } from "../src/config/db";
import { doctorProfiles, specializations } from "../src/db/schema";
import { seedTestSpecializations } from "./helpers/seedSpecializations";
import { bearer, registerDoctor } from "./helpers/auth";
import type { TestSession } from "./helpers/auth";

const getSpecId = async (name: string): Promise<number> => {
  const row = await db.query.specializations.findFirst({
    where: eq(specializations.name, name),
  });
  if (!row) throw new Error(`Fixture: ${name} not seeded`);
  return row.id;
};

const completeDoctor = async (
  email: string,
  specId: number,
  fullName = "Test Doctor",
  fee = 1500,
  verified = true,
): Promise<TestSession> => {
  const session = await registerDoctor(email, fullName);
  const res = await request(app)
    .put("/api/me/profile")
    .set("Authorization", bearer(session))
    .send({
      specializationId: specId,
      bio: "Experienced specialist.",
      yearsOfExperience: 5,
      consultationFee: fee,
      slotDurationMinutes: 30,
    });
  if (res.status !== 200) {
    throw new Error(`completeDoctor PUT failed: ${res.status} ${res.text}`);
  }
  if (verified) {
    await db
      .update(doctorProfiles)
      .set({ isVerified: true })
      .where(eq(doctorProfiles.userId, session.userId));
  }
  return session;
};

describe("GET /api/doctors", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("returns only complete doctors (no-profile doctor is hidden), with total + pagination", async () => {
    const cardioId = await getSpecId("Cardiology");
    const pedId = await getSpecId("Pediatrics");
    const gpId = await getSpecId("General Practice");

    await completeDoctor("list-doc1@example.com", cardioId);
    await completeDoctor("list-doc2@example.com", pedId);
    await completeDoctor("list-doc3@example.com", gpId);
    await registerDoctor("list-incomplete@example.com"); // no profile

    const res = await request(app).get("/api/doctors");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pageSize).toBe(20);
    expect(Array.isArray(res.body.data.doctors)).toBe(true);
    expect(res.body.data.doctors).toHaveLength(3);
  });

  it("filters by single and multiple specializationId", async () => {
    const cardioId = await getSpecId("Cardiology");
    const pedId = await getSpecId("Pediatrics");
    const gpId = await getSpecId("General Practice");

    await completeDoctor("spec-cardio@example.com", cardioId);
    await completeDoctor("spec-ped@example.com", pedId);
    await completeDoctor("spec-gp@example.com", gpId);

    const single = await request(app).get(
      `/api/doctors?specializationId=${cardioId}`,
    );
    expect(single.status).toBe(200);
    const singleDocs = single.body.data.doctors as Array<{
      specializationId: number;
    }>;
    expect(single.body.data.total).toBe(1);
    expect(singleDocs.every((d) => d.specializationId === cardioId)).toBe(true);

    const multi = await request(app).get(
      `/api/doctors?specializationId=${cardioId}&specializationId=${pedId}`,
    );
    expect(multi.status).toBe(200);
    expect(multi.body.data.total).toBe(2);
    const multiDocs = multi.body.data.doctors as Array<{
      specializationId: number;
    }>;
    const ids = multiDocs.map((d) => d.specializationId);
    expect(ids).toContain(cardioId);
    expect(ids).toContain(pedId);
  });

  it("filters by search (name substring, case-insensitive)", async () => {
    const specId = await getSpecId("General Practice");

    await completeDoctor("search-cruz@example.com", specId, "Dr. Cruz");
    await completeDoctor("search-reyes@example.com", specId, "Dr. Reyes");
    await completeDoctor("search-delacr@example.com", specId, "Dr. dela Cruz");

    const cruzRes = await request(app).get("/api/doctors?search=cruz");
    expect(cruzRes.status).toBe(200);
    expect(cruzRes.body.data.total).toBe(2);

    const reyesRes = await request(app).get("/api/doctors?search=Reyes");
    expect(reyesRes.status).toBe(200);
    expect(reyesRes.body.data.total).toBe(1);

    const noMatchRes = await request(app).get("/api/doctors?search=zzzzzz");
    expect(noMatchRes.status).toBe(200);
    expect(noMatchRes.body.data.total).toBe(0);
    expect(noMatchRes.body.data.doctors).toHaveLength(0);
  });
});

describe("GET /api/doctors/:id", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("returns 404 for a random UUID and for a user ID that has no profile", async () => {
    const randomUUID = "00000000-0000-0000-0000-000000000000";
    const noProfileDoc = await registerDoctor("detail-noprofile@example.com");

    const randomRes = await request(app).get(`/api/doctors/${randomUUID}`);
    expect(randomRes.status).toBe(404);

    // userId is a valid UUID but no doctor_profiles row exists for it
    const noProfileRes = await request(app).get(
      `/api/doctors/${noProfileDoc.userId}`,
    );
    expect(noProfileRes.status).toBe(404);
  });

  it("returns full doctor detail with clinicAddress and slotDurationMinutes", async () => {
    const specId = await getSpecId("Cardiology");
    const session = await registerDoctor(
      "detail-valid@example.com",
      "Dr. Valid",
    );
    const put = await request(app)
      .put("/api/me/profile")
      .set("Authorization", bearer(session))
      .send({
        specializationId: specId,
        bio: "Detail test bio.",
        yearsOfExperience: 8,
        consultationFee: 2000,
        clinicAddress: "Makati Medical Center",
        slotDurationMinutes: 30,
      });
    expect(put.status).toBe(200);

    const profileRow = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.userId, session.userId),
    });
    if (!profileRow) throw new Error("Profile row missing");

    const res = await request(app).get(`/api/doctors/${profileRow.id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const doc = res.body.data.doctor as Record<string, unknown>;
    expect(doc.id).toBe(profileRow.id);
    expect(doc.clinicAddress).toBe("Makati Medical Center");
    expect(doc.slotDurationMinutes).toBe(30);
    expect(typeof doc.specializationName).toBe("string");
    expect(doc.specializationName).toBe("Cardiology");
  });
});

describe("doctor verification gate on public list", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("excludes unverified doctors from the public list", async () => {
    const specId = await getSpecId("General Practice");
    await completeDoctor("verify-yes@example.com", specId, "Dr. Verified");
    await completeDoctor(
      "verify-no@example.com",
      specId,
      "Dr. Pending",
      1500,
      false,
    );

    const res = await request(app).get("/api/doctors");
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    const docs = res.body.data.doctors as Array<{ fullName: string }>;
    expect(docs.map((d) => d.fullName)).toEqual(["Dr. Verified"]);
  });

  it("still returns an unverified doctor on direct GET /:id", async () => {
    const specId = await getSpecId("General Practice");
    const session = await completeDoctor(
      "verify-direct@example.com",
      specId,
      "Dr. Direct",
      1500,
      false,
    );
    const profile = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.userId, session.userId),
    });
    if (!profile) throw new Error("Profile missing");

    const res = await request(app).get(`/api/doctors/${profile.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.doctor.isVerified).toBe(false);
  });
});
