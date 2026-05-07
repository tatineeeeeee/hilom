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
      bio: "Chat test doctor.",
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

interface BookingContext {
  doctorSession: TestSession;
  patientSession: TestSession;
  appointmentId: string;
}

const bookAndConfirm = async (
  prefix: string,
  options: { confirm?: boolean } = { confirm: true },
): Promise<BookingContext> => {
  const { session: docSession, profileId } = await setupDoctor(
    `${prefix}-doc@example.com`,
  );
  const testDate = nextDate(3);
  const dow = manilaDateDayOfWeek(testDate);
  await seedSchedule(profileId, [
    { dayOfWeek: dow, startTime: "09:00", endTime: "12:00" },
  ]);

  const patient = await registerPatient(`${prefix}-pat@example.com`);

  const bookRes = await request(app)
    .post("/api/appointments")
    .set("Authorization", bearer(patient))
    .send({
      doctorId: profileId,
      appointmentDate: testDate,
      slotStart: "09:00",
      slotEnd: "09:30",
    });
  if (bookRes.status !== 201) {
    throw new Error(
      `book failed: ${bookRes.status} ${JSON.stringify(bookRes.body)}`,
    );
  }
  const appointmentId = bookRes.body.data.appointment.id as string;

  if (options.confirm) {
    const confirmRes = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set("Authorization", bearer(docSession))
      .send({ status: "confirmed" });
    if (confirmRes.status !== 200) {
      throw new Error(
        `confirm failed: ${confirmRes.status} ${JSON.stringify(confirmRes.body)}`,
      );
    }
  }

  return {
    doctorSession: docSession,
    patientSession: patient,
    appointmentId,
  };
};

const getConversationId = async (
  appointmentId: string,
  session: TestSession,
): Promise<string> => {
  const res = await request(app)
    .get(`/api/appointments/${appointmentId}/conversation`)
    .set("Authorization", bearer(session));
  if (res.status !== 200) {
    throw new Error(
      `getConversation failed: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
  return res.body.data.conversation.id as string;
};

// ---------- HTTP-only chat tests ----------

describe("Conversation creation on confirm", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("creates a conversation when an appointment is confirmed", async () => {
    const { appointmentId, patientSession } =
      await bookAndConfirm("convcreate");

    const res = await request(app)
      .get(`/api/appointments/${appointmentId}/conversation`)
      .set("Authorization", bearer(patientSession));

    expect(res.status).toBe(200);
    expect(res.body.data.conversation.appointmentId).toBe(appointmentId);
  });

  it("returns 404 for an appointment that has not been confirmed", async () => {
    const { appointmentId, patientSession } = await bookAndConfirm(
      "convpending",
      { confirm: false },
    );

    const res = await request(app)
      .get(`/api/appointments/${appointmentId}/conversation`)
      .set("Authorization", bearer(patientSession));

    expect(res.status).toBe(404);
  });

  it("blocks non-participants from reading conversation", async () => {
    const { appointmentId } = await bookAndConfirm("convother");
    const stranger = await registerPatient("conv-stranger@example.com");

    const res = await request(app)
      .get(`/api/appointments/${appointmentId}/conversation`)
      .set("Authorization", bearer(stranger));

    expect(res.status).toBe(403);
  });
});

describe("Messages: send, list, paginate", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("patient and doctor can both send messages", async () => {
    const ctx = await bookAndConfirm("msgboth");
    const conversationId = await getConversationId(
      ctx.appointmentId,
      ctx.patientSession,
    );

    const a = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", bearer(ctx.patientSession))
      .send({ content: "hello doctor" });
    expect(a.status).toBe(201);

    const b = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", bearer(ctx.doctorSession))
      .send({ content: "hello patient" });
    expect(b.status).toBe(201);

    const list = await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", bearer(ctx.patientSession));
    expect(list.status).toBe(200);
    expect(list.body.data.messages).toHaveLength(2);
    expect(list.body.data.messages[0].content).toBe("hello doctor");
  });

  it("paginates messages with cursor", async () => {
    const ctx = await bookAndConfirm("msgpage");
    const conversationId = await getConversationId(
      ctx.appointmentId,
      ctx.patientSession,
    );

    for (let i = 0; i < 55; i++) {
      const r = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set("Authorization", bearer(ctx.patientSession))
        .send({ content: `msg-${i}` });
      if (r.status !== 201)
        throw new Error(`send ${i}: ${r.status} ${JSON.stringify(r.body)}`);
    }

    const page1 = await request(app)
      .get(`/api/conversations/${conversationId}/messages?limit=50`)
      .set("Authorization", bearer(ctx.patientSession));
    expect(page1.status).toBe(200);
    expect(page1.body.data.messages).toHaveLength(50);
    expect(page1.body.data.hasMore).toBe(true);

    const oldestOnPage1 = page1.body.data.messages[0].createdAt as string;
    const page2 = await request(app)
      .get(
        `/api/conversations/${conversationId}/messages?limit=50&cursor=${encodeURIComponent(oldestOnPage1)}`,
      )
      .set("Authorization", bearer(ctx.patientSession));
    expect(page2.status).toBe(200);
    expect(page2.body.data.messages).toHaveLength(5);
    expect(page2.body.data.hasMore).toBe(false);
  });

  it("blocks non-participants from sending or listing", async () => {
    const ctx = await bookAndConfirm("msgforbid");
    const conversationId = await getConversationId(
      ctx.appointmentId,
      ctx.patientSession,
    );

    const stranger = await registerPatient("msg-stranger@example.com");

    const send = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", bearer(stranger))
      .send({ content: "intrusion" });
    expect(send.status).toBe(403);

    const list = await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", bearer(stranger));
    expect(list.status).toBe(403);
  });

  it("rejects empty message content", async () => {
    const ctx = await bookAndConfirm("msgempty");
    const conversationId = await getConversationId(
      ctx.appointmentId,
      ctx.patientSession,
    );

    const res = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", bearer(ctx.patientSession))
      .send({ content: "   " });
    expect(res.status).toBe(400);
  });
});

// ---------- Socket.io live test ----------

describe("Socket.io message delivery", () => {
  let httpServer: http.Server;
  let port: number;

  beforeAll(async () => {
    httpServer = http.createServer(app);
    initSocket(httpServer);
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address() as AddressInfo;
        port = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await closeSocket();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("delivers message:new to the recipient over Socket.io", async () => {
    const ctx = await bookAndConfirm("socket");
    const conversationId = await getConversationId(
      ctx.appointmentId,
      ctx.patientSession,
    );

    const doctorSocket: ClientSocket = ioClient(`http://127.0.0.1:${port}`, {
      auth: { token: ctx.doctorSession.accessToken },
      transports: ["websocket"],
      forceNew: true,
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("connect timeout")), 8000);
        doctorSocket.on("connect", () => {
          clearTimeout(t);
          resolve();
        });
        doctorSocket.on("connect_error", (err) => {
          clearTimeout(t);
          reject(err);
        });
      });

      const received = new Promise<{ content: string }>((resolve, reject) => {
        const t = setTimeout(
          () => reject(new Error("message:new timeout")),
          8000,
        );
        doctorSocket.on(
          "message:new",
          (payload: { message: { content: string } }) => {
            clearTimeout(t);
            resolve({ content: payload.message.content });
          },
        );
      });

      const r = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set("Authorization", bearer(ctx.patientSession))
        .send({ content: "hi via socket" });
      expect(r.status).toBe(201);

      const payload = await received;
      expect(payload.content).toBe("hi via socket");
    } finally {
      doctorSocket.disconnect();
    }
  });

  it("rejects sockets without a valid token", async () => {
    const bad: ClientSocket = ioClient(`http://127.0.0.1:${port}`, {
      auth: { token: "not-a-real-token" },
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("no error event")), 8000);
        bad.on("connect_error", () => {
          clearTimeout(t);
          resolve();
        });
        bad.on("connect", () => {
          clearTimeout(t);
          reject(new Error("should not have connected"));
        });
      });
    } finally {
      bad.disconnect();
    }
  });
});

// ---------- Sitting 2 tests: unread, mark read, list ----------

describe("Unread counts and conversation list", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("counts unread messages from the other party", async () => {
    const ctx = await bookAndConfirm("unread1");
    const conversationId = await getConversationId(
      ctx.appointmentId,
      ctx.patientSession,
    );

    for (let i = 0; i < 3; i++) {
      await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set("Authorization", bearer(ctx.doctorSession))
        .send({ content: `from doc ${i}` });
    }

    const res = await request(app)
      .get("/api/me/unread-count")
      .set("Authorization", bearer(ctx.patientSession));

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(3);
  });

  it("does not count own messages as unread", async () => {
    const ctx = await bookAndConfirm("unread2");
    const conversationId = await getConversationId(
      ctx.appointmentId,
      ctx.patientSession,
    );
    await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", bearer(ctx.patientSession))
      .send({ content: "to self?" });

    const res = await request(app)
      .get("/api/me/unread-count")
      .set("Authorization", bearer(ctx.patientSession));
    expect(res.body.data.count).toBe(0);
  });

  it("mark-as-read clears unread for the reader", async () => {
    const ctx = await bookAndConfirm("markread");
    const conversationId = await getConversationId(
      ctx.appointmentId,
      ctx.patientSession,
    );
    await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", bearer(ctx.doctorSession))
      .send({ content: "ping" });

    const before = await request(app)
      .get("/api/me/unread-count")
      .set("Authorization", bearer(ctx.patientSession));
    expect(before.body.data.count).toBe(1);

    const mark = await request(app)
      .post(`/api/conversations/${conversationId}/read`)
      .set("Authorization", bearer(ctx.patientSession));
    expect(mark.status).toBe(200);

    const after = await request(app)
      .get("/api/me/unread-count")
      .set("Authorization", bearer(ctx.patientSession));
    expect(after.body.data.count).toBe(0);
  });

  it("lists conversations with last message and unread", async () => {
    const ctx = await bookAndConfirm("convlist");
    const conversationId = await getConversationId(
      ctx.appointmentId,
      ctx.patientSession,
    );

    await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", bearer(ctx.doctorSession))
      .send({ content: "see you soon" });

    const res = await request(app)
      .get("/api/conversations")
      .set("Authorization", bearer(ctx.patientSession));

    expect(res.status).toBe(200);
    expect(res.body.data.conversations).toHaveLength(1);
    const item = res.body.data.conversations[0];
    expect(item.lastMessageContent).toBe("see you soon");
    expect(item.unreadCount).toBe(1);
    expect(item.appointmentId).toBe(ctx.appointmentId);
    expect(typeof item.otherPartyName).toBe("string");
  });
});
