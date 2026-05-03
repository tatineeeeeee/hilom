import request from "supertest";
import { app } from "../../src/app";

const password = "Test1234";

export interface TestSession {
  userId: string;
  accessToken: string;
}

interface RegisterResponseBody {
  success: boolean;
  data: {
    accessToken: string;
    user: { id: string };
  };
}

const isRegisterBody = (value: unknown): value is RegisterResponseBody => {
  if (typeof value !== "object" || value === null) return false;
  if (!("data" in value)) return false;
  const data = (value as { data: unknown }).data;
  if (typeof data !== "object" || data === null) return false;
  if (!("accessToken" in data) || !("user" in data)) return false;
  return true;
};

export const registerPatient = async (
  email: string,
  fullName = "Test Patient",
): Promise<TestSession> => {
  const res = await request(app).post("/api/auth/register").send({
    email,
    password,
    fullName,
    role: "patient",
  });
  if (res.status !== 201) {
    throw new Error(`registerPatient failed: ${res.status} ${res.text}`);
  }
  const body: unknown = res.body;
  if (!isRegisterBody(body)) throw new Error("Unexpected register body");
  return { userId: body.data.user.id, accessToken: body.data.accessToken };
};

export const registerDoctor = async (
  email: string,
  fullName = "Test Doctor",
): Promise<TestSession> => {
  const res = await request(app).post("/api/auth/register").send({
    email,
    password,
    fullName,
    role: "doctor",
  });
  if (res.status !== 201) {
    throw new Error(`registerDoctor failed: ${res.status} ${res.text}`);
  }
  const body: unknown = res.body;
  if (!isRegisterBody(body)) throw new Error("Unexpected register body");
  return { userId: body.data.user.id, accessToken: body.data.accessToken };
};

export const bearer = (session: TestSession): string =>
  `Bearer ${session.accessToken}`;
