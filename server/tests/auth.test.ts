import request from "supertest";
import type { Response as SupertestResponse } from "supertest";
import { eq } from "drizzle-orm";
import { app } from "../src/app";
import { db } from "../src/config/db";
import { users, patientProfiles, doctorProfiles } from "../src/db/schema";
import { seedTestSpecializations } from "./helpers/seedSpecializations";

const password = "Test1234";

const patientBody = (email: string) => ({
  email,
  password,
  fullName: "Test Patient",
  role: "patient" as const,
});

const doctorBody = (email: string) => ({
  email,
  password,
  fullName: "Test Doctor",
  role: "doctor" as const,
});

const getRefreshCookie = (response: SupertestResponse): string | null => {
  const raw: unknown = response.headers["set-cookie"];
  if (!raw) return null;
  const cookies = Array.isArray(raw) ? raw : [String(raw)];
  for (const entry of cookies) {
    if (typeof entry !== "string") continue;
    const match = /^refresh_token=([^;]+)/.exec(entry);
    if (match && match[1]) return match[1];
  }
  return null;
};

describe("POST /api/auth", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("rejects duplicate email on register with 409", async () => {
    const body = patientBody("dup@example.com");
    const first = await request(app).post("/api/auth/register").send(body);
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/auth/register").send(body);
    expect(second.status).toBe(409);
    expect(second.body.success).toBe(false);
    expect(second.body.error).toBe("Email already registered");
  });

  it("creates users + patient_profiles in one transaction (patient role)", async () => {
    const email = "patient-tx@example.com";
    const response = await request(app)
      .post("/api/auth/register")
      .send(patientBody(email));

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const userRow = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    expect(userRow).toBeTruthy();
    if (!userRow) return;
    expect(userRow.role).toBe("patient");

    const patientRow = await db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.userId, userRow.id),
    });
    expect(patientRow).toBeTruthy();

    const doctorRow = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.userId, userRow.id),
    });
    expect(doctorRow).toBeFalsy();
  });

  it("creates a user without a doctor_profiles row (doctor role)", async () => {
    const email = "doctor-tx@example.com";
    const response = await request(app)
      .post("/api/auth/register")
      .send(doctorBody(email));

    expect(response.status).toBe(201);

    const userRow = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    expect(userRow).toBeTruthy();
    if (!userRow) return;
    expect(userRow.role).toBe("doctor");

    const doctorRow = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.userId, userRow.id),
    });
    expect(doctorRow).toBeFalsy();

    const patientRow = await db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.userId, userRow.id),
    });
    expect(patientRow).toBeFalsy();
  });

  it("returns the same generic 401 for wrong password and unknown email", async () => {
    const email = "login@example.com";
    await request(app).post("/api/auth/register").send(patientBody(email));

    const wrongPwd = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "Wrong1234" });
    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "Whatever1" });

    expect(wrongPwd.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPwd.body.error).toBe(unknownEmail.body.error);
    expect(wrongPwd.body.error).toBe("Invalid email or password");
  });

  it("rotates the refresh token: old cookie stops working, new one issued", async () => {
    const email = "rotate@example.com";
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send(patientBody(email));
    const r1 = getRefreshCookie(registerRes);
    expect(r1).toBeTruthy();
    if (!r1) return;

    const refresh1 = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${r1}`);
    expect(refresh1.status).toBe(200);
    expect(typeof refresh1.body.data?.accessToken).toBe("string");
    expect(refresh1.body.data.accessToken.length).toBeGreaterThan(0);
    const r2 = getRefreshCookie(refresh1);
    expect(r2).toBeTruthy();
    expect(r2).not.toBe(r1);
    if (!r2) return;

    const refresh2 = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${r2}`);
    expect(refresh2.status).toBe(200);

    const replayOld = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${r1}`);
    expect(replayOld.status).toBe(401);
  });

  it("clears refresh_token_hash and 401s on reuse-detection", async () => {
    const email = "reuse@example.com";
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send(patientBody(email));
    const r1 = getRefreshCookie(registerRes);
    expect(r1).toBeTruthy();
    if (!r1) return;

    const refresh1 = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${r1}`);
    expect(refresh1.status).toBe(200);
    const r2 = getRefreshCookie(refresh1);
    if (!r2) throw new Error("R2 not issued");

    const replay = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${r1}`);
    expect(replay.status).toBe(401);

    const userRow = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    expect(userRow?.refreshTokenHash).toBeNull();

    const followUp = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${r2}`);
    expect(followUp.status).toBe(401);
  });
});
