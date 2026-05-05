import request from "supertest";
import { app } from "../../src/app";
import { db } from "../../src/config/db";
import { users } from "../../src/db/schema";
import { hashPassword } from "../../src/utils/password";
import type { TestSession } from "./auth";

const password = "Admin1234";

export const registerAdmin = async (
  email: string,
  fullName = "Test Admin",
): Promise<TestSession> => {
  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      role: "admin",
      fullName,
      emailVerifiedAt: new Date(),
    })
    .returning();
  if (!user) throw new Error("Failed to seed admin");

  // Log in via the regular auth flow so we get a real access token.
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  if (res.status !== 200) {
    throw new Error(`registerAdmin login failed: ${res.status} ${res.text}`);
  }
  const data = res.body.data;
  return { userId: user.id, accessToken: data.accessToken };
};
