import type { APIRequestContext } from "@playwright/test";

const SERVER = process.env.E2E_SERVER_URL ?? "http://localhost:4001";

const PASSWORD = "Test1234!";

export interface E2ESession {
  email: string;
  password: string;
  accessToken: string;
  userId: string;
}

const post = async <T>(
  request: APIRequestContext,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> => {
  const res = await request.post(`${SERVER}${path}`, {
    data: body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok()) {
    throw new Error(`POST ${path} failed: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()) as T;
};

const put = async <T>(
  request: APIRequestContext,
  path: string,
  body: unknown,
  token: string,
): Promise<T> => {
  const res = await request.put(`${SERVER}${path}`, {
    data: body,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) {
    throw new Error(`PUT ${path} failed: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()) as T;
};

interface AuthBody {
  data: { user: { id: string }; accessToken: string };
}

export const registerPatient = async (
  request: APIRequestContext,
  email = `patient-${Date.now()}@example.com`,
): Promise<E2ESession> => {
  const body = await post<AuthBody>(request, "/api/auth/register", {
    email,
    password: PASSWORD,
    fullName: "E2E Patient",
    role: "patient",
  });
  return {
    email,
    password: PASSWORD,
    accessToken: body.data.accessToken,
    userId: body.data.user.id,
  };
};

interface SpecResponse {
  data: { specializations: { id: number; name: string }[] };
}

export const seedDoctor = async (
  request: APIRequestContext,
  options: { email?: string; verified?: boolean } = {},
): Promise<E2ESession & { profileId: string }> => {
  const email = options.email ?? `doc-${Date.now()}@example.com`;
  const reg = await post<AuthBody>(request, "/api/auth/register", {
    email,
    password: PASSWORD,
    fullName: "E2E Doctor",
    role: "doctor",
  });

  const specs = await request.get(`${SERVER}/api/specializations`);
  const json = (await specs.json()) as SpecResponse;
  const gp = json.data.specializations.find((s) => s.name === "General Practice");
  if (!gp) throw new Error("Seed: General Practice missing");

  await put<unknown>(
    request,
    "/api/me/profile",
    {
      specializationId: gp.id,
      bio: "E2E test doctor.",
      yearsOfExperience: 5,
      consultationFee: 1500,
      slotDurationMinutes: 30,
    },
    reg.data.accessToken,
  );

  // Verification + profileId require admin or DB access — for E2E we skip
  // verification toggling here. Tests that need a verified+bookable doctor
  // can call seedVerifiedDoctor below.
  return {
    email,
    password: PASSWORD,
    accessToken: reg.data.accessToken,
    userId: reg.data.user.id,
    profileId: "", // populated by seedVerifiedDoctor
  };
};
