import request from "supertest";
import { eq } from "drizzle-orm";
import { app } from "../src/app";
import { db } from "../src/config/db";
import {
  patientProfiles,
  doctorProfiles,
  specializations,
} from "../src/db/schema";
import { seedTestSpecializations } from "./helpers/seedSpecializations";
import { bearer, registerDoctor, registerPatient } from "./helpers/auth";

const getSpecId = async (name: string): Promise<number> => {
  const row = await db.query.specializations.findFirst({
    where: eq(specializations.name, name),
  });
  if (!row) throw new Error(`Fixture: ${name} not seeded`);
  return row.id;
};

describe("PUT /api/me/profile", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("patient happy path: upserts patient_profiles columns", async () => {
    const session = await registerPatient("patient-happy@example.com");

    const res = await request(app)
      .put("/api/me/profile")
      .set("Authorization", bearer(session))
      .send({
        dateOfBirth: "1995-04-12",
        bloodType: "O+",
        allergies: "Peanuts; penicillin",
        emergencyContactName: "Maria Cruz",
        emergencyContactPhone: "+63 917 555 1234",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const profileRow = await db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.userId, session.userId),
    });
    expect(profileRow).toBeTruthy();
    if (!profileRow) return;
    expect(profileRow.dateOfBirth).toBe("1995-04-12");
    expect(profileRow.bloodType).toBe("O+");
    expect(profileRow.allergies).toBe("Peanuts; penicillin");
    expect(profileRow.emergencyContactName).toBe("Maria Cruz");
    expect(profileRow.emergencyContactPhone).toBe("+63 917 555 1234");

    const me = await request(app)
      .get("/api/me/profile")
      .set("Authorization", bearer(session));
    expect(me.status).toBe(200);
    expect(me.body.data.profile.bloodType).toBe("O+");
    expect(me.body.data.user.role).toBe("patient");
  });

  it("doctor happy path: insert then update keeps a single row", async () => {
    const specId = await getSpecId("Cardiology");
    const session = await registerDoctor("doctor-happy@example.com");

    const meBefore = await request(app)
      .get("/api/me/profile")
      .set("Authorization", bearer(session));
    expect(meBefore.body.data.profile).toBeNull();

    const first = await request(app)
      .put("/api/me/profile")
      .set("Authorization", bearer(session))
      .send({
        specializationId: specId,
        bio: "Cardiologist with 10 years of experience.",
        yearsOfExperience: 10,
        consultationFee: 1500,
        clinicAddress: "Makati Medical Center",
        slotDurationMinutes: 30,
      });
    expect(first.status).toBe(200);

    const second = await request(app)
      .put("/api/me/profile")
      .set("Authorization", bearer(session))
      .send({
        specializationId: specId,
        bio: "Updated bio.",
        yearsOfExperience: 11,
        consultationFee: 1800,
      });
    expect(second.status).toBe(200);

    const rows = await db
      .select()
      .from(doctorProfiles)
      .where(eq(doctorProfiles.userId, session.userId));
    expect(rows.length).toBe(1);
    const row = rows[0];
    if (!row) return;
    expect(row.bio).toBe("Updated bio.");
    expect(row.yearsOfExperience).toBe(11);
    expect(Number(row.consultationFee)).toBe(1800);
    expect(row.slotDurationMinutes).toBe(30);
  });

  it("doctor missing specialization → 400 with field error", async () => {
    const session = await registerDoctor("doctor-missing@example.com");

    const res = await request(app)
      .put("/api/me/profile")
      .set("Authorization", bearer(session))
      .send({
        bio: "Bio without a specialization.",
        yearsOfExperience: 3,
        consultationFee: 1000,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.details?.fieldErrors?.specializationId).toBeTruthy();

    const row = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.userId, session.userId),
    });
    expect(row).toBeFalsy();
  });

  it("role mismatch: patient sending doctor-shaped body → 400, no doctor row", async () => {
    const specId = await getSpecId("General Practice");
    const session = await registerPatient("patient-mismatch@example.com");

    const res = await request(app)
      .put("/api/me/profile")
      .set("Authorization", bearer(session))
      .send({
        role: "doctor",
        specializationId: specId,
        bio: "Sneaky bio.",
        yearsOfExperience: 5,
        consultationFee: 999,
      });

    expect(res.status).toBe(400);

    const doctorRow = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.userId, session.userId),
    });
    expect(doctorRow).toBeFalsy();

    const patientRow = await db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.userId, session.userId),
    });
    expect(patientRow).toBeTruthy();
    if (!patientRow) return;
    expect(patientRow.dateOfBirth).toBeNull();
  });
});
