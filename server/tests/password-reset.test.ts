import request from "supertest";
import { eq } from "drizzle-orm";
import { app } from "../src/app";
import { db } from "../src/config/db";
import { users, passwordResetTokens } from "../src/db/schema";
import { _testCapture } from "../src/services/email.service";
import { seedTestSpecializations } from "./helpers/seedSpecializations";

const oldPassword = "Old1234X";
const newPassword = "New1234Y";

const registerPatient = async (email: string) => {
  await request(app)
    .post("/api/auth/register")
    .send({
      email,
      password: oldPassword,
      fullName: "Reset Test",
      role: "patient" as const,
    });
};

const extractToken = (html: string): string => {
  const match = /token=([A-Za-z0-9_-]+)/.exec(html);
  if (!match || !match[1]) throw new Error("token not found in email html");
  return match[1];
};

const resetEmails = (): { html: string }[] =>
  _testCapture.all().filter((m) => m.subject === "Reset your Hilom password");

describe("Password reset", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
    _testCapture.clear();
  });

  it("happy path: rotates password, clears all sessions, kills all sibling reset tokens", async () => {
    const email = "reset-happy@example.com";
    await registerPatient(email);
    _testCapture.clear();

    for (let i = 0; i < 3; i++) {
      const r = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email });
      expect(r.status).toBe(200);
    }

    const reset = resetEmails();
    expect(reset).toHaveLength(3);
    const tokens = reset.map((m) => extractToken(m.html));

    const beforeUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!beforeUser) throw new Error("user not found");
    const oldHash = beforeUser.passwordHash;

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: tokens[0], newPassword });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { reset: true },
    });

    const afterUser = await db.query.users.findFirst({
      where: eq(users.id, beforeUser.id),
    });
    expect(afterUser?.passwordHash).not.toBe(oldHash);
    expect(afterUser?.refreshTokenHash).toBeNull();

    const tokenRows = await db.query.passwordResetTokens.findMany({
      where: eq(passwordResetTokens.userId, beforeUser.id),
    });
    expect(tokenRows).toHaveLength(3);
    for (const row of tokenRows) {
      expect(row.usedAt).toBeInstanceOf(Date);
    }

    const oldLogin = await request(app)
      .post("/api/auth/login")
      .send({ email, password: oldPassword });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post("/api/auth/login")
      .send({ email, password: newPassword });
    expect(newLogin.status).toBe(200);
  });

  it("expired token returns 401, password unchanged", async () => {
    const email = "reset-expired@example.com";
    await registerPatient(email);
    _testCapture.clear();

    await request(app).post("/api/auth/forgot-password").send({ email });
    const sent = resetEmails()[0];
    if (!sent) throw new Error("no reset email captured");
    const token = extractToken(sent.html);

    const userRow = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!userRow) throw new Error("user not found");
    const oldHash = userRow.passwordHash;
    await db
      .update(passwordResetTokens)
      .set({ expiresAt: new Date(Date.now() - 60 * 60 * 1000) })
      .where(eq(passwordResetTokens.userId, userRow.id));

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword });
    expect(res.status).toBe(401);

    const after = await db.query.users.findFirst({
      where: eq(users.id, userRow.id),
    });
    expect(after?.passwordHash).toBe(oldHash);
  });

  it("replay returns 401, password unchanged after the first reset", async () => {
    const email = "reset-replay@example.com";
    await registerPatient(email);
    _testCapture.clear();

    await request(app).post("/api/auth/forgot-password").send({ email });
    const sent = resetEmails()[0];
    if (!sent) throw new Error("no reset email captured");
    const token = extractToken(sent.html);

    const first = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword });
    expect(first.status).toBe(200);

    const userRow = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!userRow) throw new Error("user not found");
    const hashAfterFirst = userRow.passwordHash;

    const second = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "Other7890Z" });
    expect(second.status).toBe(401);

    const after = await db.query.users.findFirst({
      where: eq(users.id, userRow.id),
    });
    expect(after?.passwordHash).toBe(hashAfterFirst);
  });

  it("wrong token returns 401", async () => {
    const garbage = "GqJ7iVjC4Q3p2D8sN5x6Y0l_vWzKfMnRtXuOhBcEaA1";
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: garbage, newPassword });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid or expired reset link");
  });
});
