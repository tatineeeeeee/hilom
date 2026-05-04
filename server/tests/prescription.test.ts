import http from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { eq } from "drizzle-orm";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";

import { app } from "../src/app";
import { db } from "../src/config/db";
import { doctorProfiles, doctorSchedules } from "../src/db/schema";
import { initSocket, closeSocket } from "../src/socket";
import { seedTestSpecializations } from "./helpers/seedSpecializations";
import {
  bearer,
  registerDoctor,
  registerPatient,
  type TestSession,
} from "./helpers/auth";
import { confirmPayment } from "./helpers/payment";
import {
  todayInManila,
  addDaysToManilaDate,
  manilaDateDayOfWeek,
} from "../src/utils/manilaTime";

// ---------- shared fixtures ----------

const getSpecId = async (name: string): Promise<number> => {
  const { specializations } = await import("../src/db/schema");
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

interface DoctorFixture {
  session: TestSession;
  profileId: string;
}

const setupDoctor = async (email: string): Promise<DoctorFixture> => {
  const specId = await getSpecId("General Practice");
  const session = await registerDoctor(email);
  await request(app)
    .put("/api/me/profile")
    .set("Authorization", bearer(session))
    .send({
      specializationId: specId,
      bio: "Prescription test doctor.",
      yearsOfExperience: 5,
      consultationFee: 1000,
      slotDurationMinutes: 30,
    });
  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, session.userId),
  });
  if (!profile) throw new Error("Doctor profile not found after setup");
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

/** Books → confirms → completes an appointment, returns its id */
const createCompletedAppointment = async (
  patientSession: TestSession,
  doctorSession: TestSession,
  profileId: string,
  date: string,
  slotStart: string,
  slotEnd: string,
): Promise<string> => {
  const bookRes = await request(app)
    .post("/api/appointments")
    .set("Authorization", bearer(patientSession))
    .send({ doctorId: profileId, appointmentDate: date, slotStart, slotEnd });
  if (bookRes.status !== 201) {
    throw new Error(
      `book failed: ${bookRes.status} ${JSON.stringify(bookRes.body)}`,
    );
  }
  const id = bookRes.body.data.appointment.id as string;

  await request(app)
    .patch(`/api/appointments/${id}/status`)
    .set("Authorization", bearer(doctorSession))
    .send({ status: "confirmed" });
  await confirmPayment(id, patientSession);
  await request(app)
    .patch(`/api/appointments/${id}/status`)
    .set("Authorization", bearer(doctorSession))
    .send({ status: "completed" });

  return id;
};

const validMedications = [
  {
    medicationName: "Amoxicillin",
    dosage: "500mg",
    frequency: "3x daily",
    duration: "7 days",
    instructions: "Take with food",
  },
];

// ---------- tests ----------

describe("POST /api/appointments/:id/prescription", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("doctor writes prescription for completed appointment", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "rx-write@example.com",
    );
    const testDate = nextDate(1);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("rx-write-p@example.com");
    const appointmentId = await createCompletedAppointment(
      patient,
      docSession,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );

    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/prescription`)
      .set("Authorization", bearer(docSession))
      .send({ medications: validMedications, notes: "Take plenty of rest" });

    expect(res.status).toBe(201);
    expect(res.body.data.prescription.medications).toHaveLength(1);
    expect(res.body.data.prescription.medications[0].medicationName).toBe(
      "Amoxicillin",
    );
    expect(res.body.data.prescription.notes).toBe("Take plenty of rest");
    expect(res.body.data.prescription.doctorName).toBeTruthy();
    expect(res.body.data.prescription.patientName).toBeTruthy();
  });

  it("returns 409 when appointment is not completed", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "rx-notdone@example.com",
    );
    const testDate = nextDate(2);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("rx-notdone-p@example.com");

    const bookRes = await request(app)
      .post("/api/appointments")
      .set("Authorization", bearer(patient))
      .send({
        doctorId: profileId,
        appointmentDate: testDate,
        slotStart: "09:00",
        slotEnd: "09:30",
      });
    const appointmentId = bookRes.body.data.appointment.id as string;

    // Confirm but do NOT complete
    await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "confirmed" });

    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/prescription`)
      .set("Authorization", bearer(docSession))
      .send({ medications: validMedications });

    expect(res.status).toBe(409);
  });

  it("returns 409 when prescription already exists", async () => {
    const { session: docSession, profileId } =
      await setupDoctor("rx-dup@example.com");
    const testDate = nextDate(3);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("rx-dup-p@example.com");
    const appointmentId = await createCompletedAppointment(
      patient,
      docSession,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );

    await request(app)
      .post(`/api/appointments/${appointmentId}/prescription`)
      .set("Authorization", bearer(docSession))
      .send({ medications: validMedications });

    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/prescription`)
      .set("Authorization", bearer(docSession))
      .send({ medications: validMedications });

    expect(res.status).toBe(409);
  });

  it("returns 403 when a different doctor tries to write", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "rx-otherdoc@example.com",
    );
    const testDate = nextDate(4);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("rx-otherdoc-p@example.com");
    const appointmentId = await createCompletedAppointment(
      patient,
      docSession,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );

    const { session: otherDoc } = await setupDoctor("rx-otherdoc2@example.com");

    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/prescription`)
      .set("Authorization", bearer(otherDoc))
      .send({ medications: validMedications });

    expect(res.status).toBe(403);
  });

  it("returns 403 when a patient tries to write", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "rx-patwrite@example.com",
    );
    const testDate = nextDate(5);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("rx-patwrite-p@example.com");
    const appointmentId = await createCompletedAppointment(
      patient,
      docSession,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );

    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/prescription`)
      .set("Authorization", bearer(patient))
      .send({ medications: validMedications });

    expect(res.status).toBe(403);
  });

  it("returns 400 when medications array is empty", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "rx-empty@example.com",
    );
    const testDate = nextDate(6);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("rx-empty-p@example.com");
    const appointmentId = await createCompletedAppointment(
      patient,
      docSession,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );

    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/prescription`)
      .set("Authorization", bearer(docSession))
      .send({ medications: [] });

    expect(res.status).toBe(400);
  });

  it("returns 400 when required medication fields are missing", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "rx-fields@example.com",
    );
    const testDate = nextDate(1);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "10:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("rx-fields-p@example.com");
    const appointmentId = await createCompletedAppointment(
      patient,
      docSession,
      profileId,
      testDate,
      "10:00",
      "10:30",
    );

    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/prescription`)
      .set("Authorization", bearer(docSession))
      .send({ medications: [{ medicationName: "Amoxicillin" }] }); // missing dosage etc.

    expect(res.status).toBe(400);
  });
});

describe("GET /api/appointments/:id/prescription", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("patient and doctor can read the prescription", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "rx-read@example.com",
    );
    const testDate = nextDate(2);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("rx-read-p@example.com");
    const appointmentId = await createCompletedAppointment(
      patient,
      docSession,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );

    await request(app)
      .post(`/api/appointments/${appointmentId}/prescription`)
      .set("Authorization", bearer(docSession))
      .send({ medications: validMedications });

    const patientRes = await request(app)
      .get(`/api/appointments/${appointmentId}/prescription`)
      .set("Authorization", bearer(patient));
    expect(patientRes.status).toBe(200);
    expect(patientRes.body.data.prescription.medications).toHaveLength(1);

    const doctorRes = await request(app)
      .get(`/api/appointments/${appointmentId}/prescription`)
      .set("Authorization", bearer(docSession));
    expect(doctorRes.status).toBe(200);
  });

  it("returns 403 for a different user", async () => {
    const { session: docSession, profileId } =
      await setupDoctor("rx-403@example.com");
    const testDate = nextDate(3);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("rx-403-p@example.com");
    const appointmentId = await createCompletedAppointment(
      patient,
      docSession,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );

    await request(app)
      .post(`/api/appointments/${appointmentId}/prescription`)
      .set("Authorization", bearer(docSession))
      .send({ medications: validMedications });

    const stranger = await registerPatient("rx-403-stranger@example.com");
    const res = await request(app)
      .get(`/api/appointments/${appointmentId}/prescription`)
      .set("Authorization", bearer(stranger));
    expect(res.status).toBe(403);
  });

  it("returns 404 when no prescription exists yet", async () => {
    const { session: docSession, profileId } =
      await setupDoctor("rx-404@example.com");
    const testDate = nextDate(4);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("rx-404-p@example.com");
    const appointmentId = await createCompletedAppointment(
      patient,
      docSession,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );

    const res = await request(app)
      .get(`/api/appointments/${appointmentId}/prescription`)
      .set("Authorization", bearer(patient));
    expect(res.status).toBe(404);
  });
});

describe("GET /api/prescriptions", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("patient list is scoped to their own prescriptions", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "rx-list-doc@example.com",
    );
    const testDate = nextDate(5);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);

    const patient1 = await registerPatient("rx-list-p1@example.com");
    const patient2 = await registerPatient("rx-list-p2@example.com");

    const id1 = await createCompletedAppointment(
      patient1,
      docSession,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );
    const id2 = await createCompletedAppointment(
      patient2,
      docSession,
      profileId,
      testDate,
      "09:30",
      "10:00",
    );

    await request(app)
      .post(`/api/appointments/${id1}/prescription`)
      .set("Authorization", bearer(docSession))
      .send({ medications: validMedications });
    await request(app)
      .post(`/api/appointments/${id2}/prescription`)
      .set("Authorization", bearer(docSession))
      .send({ medications: validMedications });

    const res = await request(app)
      .get("/api/prescriptions")
      .set("Authorization", bearer(patient1));
    expect(res.status).toBe(200);
    expect(res.body.data.prescriptions).toHaveLength(1);
    expect(res.body.data.prescriptions[0].appointmentId).toBe(id1);
  });

  it("doctor list is scoped to prescriptions they wrote", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "rx-doclist@example.com",
    );
    const testDate = nextDate(6);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
    ]);
    const patient = await registerPatient("rx-doclist-p@example.com");
    const appointmentId = await createCompletedAppointment(
      patient,
      docSession,
      profileId,
      testDate,
      "09:00",
      "09:30",
    );

    await request(app)
      .post(`/api/appointments/${appointmentId}/prescription`)
      .set("Authorization", bearer(docSession))
      .send({ medications: validMedications });

    const { session: otherDoc } = await setupDoctor("rx-doclist2@example.com");

    const res = await request(app)
      .get("/api/prescriptions")
      .set("Authorization", bearer(docSession));
    expect(res.status).toBe(200);
    expect(res.body.data.prescriptions).toHaveLength(1);

    const otherRes = await request(app)
      .get("/api/prescriptions")
      .set("Authorization", bearer(otherDoc));
    expect(otherRes.status).toBe(200);
    expect(otherRes.body.data.prescriptions).toHaveLength(0);
  });
});

describe("Socket.io prescription:new event", () => {
  let httpServer: http.Server;
  let port: number;

  beforeAll((done) => {
    httpServer = http.createServer(app);
    initSocket(httpServer);
    httpServer.listen(0, () => {
      const addr = httpServer.address() as AddressInfo;
      port = addr.port;
      done();
    });
  });

  afterAll(async () => {
    await closeSocket();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("emits prescription:new to the patient when doctor issues prescription", async () => {
    const { session: docSession, profileId } = await setupDoctor(
      "rx-socket-doc@example.com",
    );
    const testDate = nextDate(1);
    const dow = manilaDateDayOfWeek(testDate);
    await seedSchedule(profileId, [
      { dayOfWeek: dow, startTime: "11:00", endTime: "13:00" },
    ]);
    const patient = await registerPatient("rx-socket-p@example.com");
    const appointmentId = await createCompletedAppointment(
      patient,
      docSession,
      profileId,
      testDate,
      "11:00",
      "11:30",
    );

    const patientSocket: ClientSocket = ioClient(`http://127.0.0.1:${port}`, {
      auth: { token: patient.accessToken },
      transports: ["websocket"],
      forceNew: true,
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("connect timeout")), 3000);
        patientSocket.on("connect", () => {
          clearTimeout(t);
          resolve();
        });
        patientSocket.on("connect_error", (err) => {
          clearTimeout(t);
          reject(err);
        });
      });

      const received = new Promise<{ appointmentId: string }>(
        (resolve, reject) => {
          const t = setTimeout(
            () => reject(new Error("prescription:new timeout")),
            3000,
          );
          patientSocket.on(
            "prescription:new",
            (payload: { appointmentId: string }) => {
              clearTimeout(t);
              resolve(payload);
            },
          );
        },
      );

      const r = await request(app)
        .post(`/api/appointments/${appointmentId}/prescription`)
        .set("Authorization", bearer(docSession))
        .send({ medications: validMedications });
      expect(r.status).toBe(201);

      const payload = await received;
      expect(payload.appointmentId).toBe(appointmentId);
    } finally {
      patientSocket.disconnect();
    }
  });
});
