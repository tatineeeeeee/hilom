import request from "supertest";
import { eq } from "drizzle-orm";
import { app } from "../src/app";
import { db } from "../src/config/db";
import { doctorProfiles, specializations } from "../src/db/schema";
import { seedTestSpecializations } from "./helpers/seedSpecializations";
import { bearer, registerDoctor } from "./helpers/auth";

describe("PUT & GET /api/me/schedule", () => {
  beforeEach(async () => {
    await seedTestSpecializations();
  });

  it("round-trip: save schedule then retrieve same values (replace-all semantics)", async () => {
    const specId = (
      await db.query.specializations.findFirst({
        where: eq(specializations.name, "Cardiology"),
      })
    )?.id;
    if (!specId) throw new Error("Specialization not seeded");

    const session = await registerDoctor("schedule-rt@example.com");
    await request(app)
      .put("/api/me/profile")
      .set("Authorization", bearer(session))
      .send({
        specializationId: specId,
        bio: "Schedule test doctor.",
        yearsOfExperience: 2,
        consultationFee: 800,
        slotDurationMinutes: 30,
      });

    const profile = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.userId, session.userId),
    });
    if (!profile) throw new Error("Profile missing");

    // First PUT — Mon + Wed
    const put1 = await request(app)
      .put("/api/me/schedule")
      .set("Authorization", bearer(session))
      .send([
        { dayOfWeek: 1, startTime: "09:00", endTime: "12:00", isActive: true },
        { dayOfWeek: 3, startTime: "13:00", endTime: "16:00", isActive: true },
      ]);
    expect(put1.status).toBe(200);
    expect(put1.body.data.schedule).toHaveLength(2);

    // GET — confirms round-trip
    const get1 = await request(app)
      .get("/api/me/schedule")
      .set("Authorization", bearer(session));
    expect(get1.status).toBe(200);
    const rows = get1.body.data.schedule as Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }>;
    const days = rows.map((r) => r.dayOfWeek).sort();
    expect(days).toEqual([1, 3]);
    const mon = rows.find((r) => r.dayOfWeek === 1);
    expect(mon?.startTime).toBe("09:00:00");
    expect(mon?.endTime).toBe("12:00:00");

    // Second PUT — replaces Mon+Wed with just Fri
    const put2 = await request(app)
      .put("/api/me/schedule")
      .set("Authorization", bearer(session))
      .send([
        { dayOfWeek: 5, startTime: "08:00", endTime: "17:00", isActive: true },
      ]);
    expect(put2.status).toBe(200);
    expect(put2.body.data.schedule).toHaveLength(1);

    const get2 = await request(app)
      .get("/api/me/schedule")
      .set("Authorization", bearer(session));
    expect(get2.status).toBe(200);
    expect(get2.body.data.schedule).toHaveLength(1);
    expect(get2.body.data.schedule[0].dayOfWeek).toBe(5);
  });
});
