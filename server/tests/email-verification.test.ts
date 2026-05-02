import request from "supertest";
import { eq } from "drizzle-orm";
import { app } from "../src/app";
import { db } from "../src/config/db";
import { users, emailVerificationTokens } from "../src/db/schema";
import { _testCapture } from "../src/services/email.service";
import { seedTestSpecializations } from "./helpers/seedSpecializations";

const password = "Test1234";

const patientBody = (email: string) => ({
  email,
  password,
  fullName: "Verify Test",
  role: "patient" as const,
});

const extractToken = (html: string): string => {
  const match = /token=([A-Za-z0-9_-]+)/.exec(html);
  if (!match || !match[1]) throw new Error("token not found in email html");
  return match[1];
};

describe("Email verification", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
    _testCapture.clear();
  });

  it("happy path: register sends an email; GET /verify-email flips email_verified_at and marks the token used", async () => {
    const email = "verify-happy@example.com";
    const reg = await request(app)
      .post("/api/auth/register")
      .send(patientBody(email));
    expect(reg.status).toBe(201);

    const captured = _testCapture.all();
    expect(captured).toHaveLength(1);
    const sent = captured[0];
    expect(sent).toBeDefined();
    if (!sent) return;
    expect(sent.subject).toBe("Verify your Hilom email");
    expect(sent.to).toBe(email);

    const token = extractToken(sent.html);

    const verify = await request(app).get(
      `/api/auth/verify-email?token=${token}`,
    );
    expect(verify.status).toBe(200);
    expect(verify.body).toEqual({
      success: true,
      data: { verified: true },
    });

    const userRow = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    expect(userRow?.emailVerifiedAt).toBeInstanceOf(Date);

    const tokenRow = await db.query.emailVerificationTokens.findFirst({
      where: eq(emailVerificationTokens.userId, userRow?.id ?? ""),
    });
    expect(tokenRow?.usedAt).toBeInstanceOf(Date);
  });

  it("expired token returns 401 and leaves the user unverified", async () => {
    const email = "verify-expired@example.com";
    await request(app).post("/api/auth/register").send(patientBody(email));
    const sent = _testCapture.all()[0];
    if (!sent) throw new Error("no email captured");
    const token = extractToken(sent.html);

    const userRow = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!userRow) throw new Error("user not found");
    await db
      .update(emailVerificationTokens)
      .set({ expiresAt: new Date(Date.now() - 60 * 60 * 1000) })
      .where(eq(emailVerificationTokens.userId, userRow.id));

    const verify = await request(app).get(
      `/api/auth/verify-email?token=${token}`,
    );
    expect(verify.status).toBe(401);
    expect(verify.body.error).toBe("Invalid or expired verification link");

    const after = await db.query.users.findFirst({
      where: eq(users.id, userRow.id),
    });
    expect(after?.emailVerifiedAt).toBeNull();

    const tokenRow = await db.query.emailVerificationTokens.findFirst({
      where: eq(emailVerificationTokens.userId, userRow.id),
    });
    expect(tokenRow?.usedAt).toBeNull();
  });

  it("replay returns 401, but user stays verified (idempotent contract)", async () => {
    const email = "verify-replay@example.com";
    await request(app).post("/api/auth/register").send(patientBody(email));
    const sent = _testCapture.all()[0];
    if (!sent) throw new Error("no email captured");
    const token = extractToken(sent.html);

    const first = await request(app).get(
      `/api/auth/verify-email?token=${token}`,
    );
    expect(first.status).toBe(200);

    const second = await request(app).get(
      `/api/auth/verify-email?token=${token}`,
    );
    expect(second.status).toBe(401);

    const userRow = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    expect(userRow?.emailVerifiedAt).toBeInstanceOf(Date);
  });

  it("wrong token returns 401", async () => {
    const garbage = "GqJ7iVjC4Q3p2D8sN5x6Y0l_vWzKfMnRtXuOhBcEaA1";
    const verify = await request(app).get(
      `/api/auth/verify-email?token=${garbage}`,
    );
    expect(verify.status).toBe(401);
    expect(verify.body.error).toBe("Invalid or expired verification link");
  });
});
