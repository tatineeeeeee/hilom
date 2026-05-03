import { eq } from "drizzle-orm";
import { db, pool } from "../config/db";
import { logger } from "../config/logger";
import {
  users,
  doctorProfiles,
  doctorSchedules,
  specializations,
} from "./schema";
import { hashPassword } from "../utils/password";

const DOCTOR = {
  email: "doctor@hilom.dev",
  password: "Doctor1234",
  fullName: "Dr. Maria Santos",
  bio: "Board-certified general practitioner with 10 years of experience. I focus on preventive care, chronic disease management, and patient education.",
  yearsOfExperience: 10,
  consultationFee: "500.00",
  clinicAddress: "123 Rizal Avenue, Makati City",
  slotDurationMinutes: 30,
  specialization: "General Practice",
};

const SCHEDULE = [
  { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }, // Mon
  { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" }, // Tue
  { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" }, // Wed
  { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" }, // Thu
  { dayOfWeek: 5, startTime: "09:00", endTime: "12:00" }, // Fri (half day)
];

const seed = async () => {
  logger.info("Seeding demo doctor...");

  const spec = await db.query.specializations.findFirst({
    where: eq(specializations.name, DOCTOR.specialization),
  });
  if (!spec) {
    logger.error("Run db:seed first to create specializations");
    process.exit(1);
  }

  // Check if doctor already exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, DOCTOR.email),
  });
  if (existing) {
    logger.info("Demo doctor already exists — skipping");
    await pool.end();
    process.exit(0);
  }

  const passwordHash = await hashPassword(DOCTOR.password);

  await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email: DOCTOR.email,
        passwordHash,
        role: "doctor",
        fullName: DOCTOR.fullName,
      })
      .returning();

    if (!user) throw new Error("Failed to create user");

    const [profile] = await tx
      .insert(doctorProfiles)
      .values({
        userId: user.id,
        specializationId: spec.id,
        bio: DOCTOR.bio,
        yearsOfExperience: DOCTOR.yearsOfExperience,
        consultationFee: DOCTOR.consultationFee,
        clinicAddress: DOCTOR.clinicAddress,
        slotDurationMinutes: DOCTOR.slotDurationMinutes,
      })
      .returning();

    if (!profile) throw new Error("Failed to create profile");

    await tx.insert(doctorSchedules).values(
      SCHEDULE.map((s) => ({
        doctorId: profile.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isActive: true,
      })),
    );
  });

  logger.info("Demo doctor seeded:");
  logger.info(`  Email:    ${DOCTOR.email}`);
  logger.info(`  Password: ${DOCTOR.password}`);
  logger.info(`  Schedule: Mon-Thu 9am-5pm, Fri 9am-12pm`);

  await pool.end();
  process.exit(0);
};

seed().catch((err: unknown) => {
  logger.error({ err }, "Seed failed");
  process.exit(1);
});
