import { eq } from "drizzle-orm";
import { db, pool } from "../config/db";
import { logger } from "../config/logger";
import {
  users,
  doctorProfiles,
  doctorSchedules,
  specializations,
  appointments,
  reviews,
} from "./schema";
import { hashPassword } from "../utils/password";

// ─── helpers ─────────────────────────────────────────────────────────────────

const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const avg = (ratings: number[]): string =>
  (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2);

// ─── data ────────────────────────────────────────────────────────────────────

const SPECS = [
  {
    name: "General Practice",
    description: "Primary care and general health",
    iconName: "stethoscope",
  },
  {
    name: "Pediatrics",
    description: "Child and adolescent medicine",
    iconName: "baby",
  },
  {
    name: "Cardiology",
    description: "Heart and cardiovascular system",
    iconName: "heart-pulse",
  },
  {
    name: "Dermatology",
    description: "Skin, hair, and nail conditions",
    iconName: "scan-face",
  },
  {
    name: "Orthopedics",
    description: "Bones, joints, and muscles",
    iconName: "bone",
  },
  {
    name: "OB-GYN",
    description: "Women's reproductive health",
    iconName: "baby",
  },
  {
    name: "Neurology",
    description: "Brain and nervous system",
    iconName: "brain",
  },
  {
    name: "Ophthalmology",
    description: "Eye care and vision",
    iconName: "eye",
  },
  { name: "ENT", description: "Ear, nose, and throat", iconName: "ear" },
  {
    name: "Psychiatry",
    description: "Mental health and behavioral disorders",
    iconName: "brain-cog",
  },
  {
    name: "Internal Medicine",
    description: "Diagnosis and treatment of adult diseases",
    iconName: "stethoscope",
  },
  {
    name: "Endocrinology",
    description: "Hormonal and metabolic disorders",
    iconName: "activity",
  },
];

const ADMIN = {
  email: "admin@hilom.dev",
  password: "Admin1234",
  fullName: "Hilom Admin",
};

const SEED_PATIENTS = [
  {
    email: "patient1@hilom.dev",
    password: "Patient1234",
    fullName: "Ana Reyes",
  },
  {
    email: "patient2@hilom.dev",
    password: "Patient1234",
    fullName: "Carlos Santos",
  },
];

const DOCTORS = [
  {
    email: "dr.santos@hilom.dev",
    password: "Doctor1234",
    fullName: "Dr. Maria Santos",
    specialization: "General Practice",
    bio: "Board-certified general practitioner with 10 years of experience. I focus on preventive care, chronic disease management, and patient education.",
    yearsOfExperience: 10,
    consultationFee: "500.00",
    clinicAddress: "123 Rizal Avenue, Makati City",
    slotDurationMinutes: 30,
    isVerified: true,
    schedule: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 5, startTime: "09:00", endTime: "12:00" },
    ],
  },
  {
    email: "dr.reyes@hilom.dev",
    password: "Doctor1234",
    fullName: "Dr. Jose Reyes",
    specialization: "Cardiology",
    bio: "Interventional cardiologist with 15 years of experience. Fellow of the Philippine Heart Association. Specializes in complex coronary artery disease.",
    yearsOfExperience: 15,
    consultationFee: "1200.00",
    clinicAddress: "456 Ayala Avenue, Makati City",
    slotDurationMinutes: 60,
    isVerified: true,
    schedule: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
    ],
  },
  {
    email: "dr.cruz@hilom.dev",
    password: "Doctor1234",
    fullName: "Dr. Ana Cruz",
    specialization: "Pediatrics",
    bio: "Pediatrician dedicated to the health of children from newborns to teenagers. Trained at the Philippine Children's Medical Center.",
    yearsOfExperience: 8,
    consultationFee: "800.00",
    clinicAddress: "789 Quezon Avenue, Quezon City",
    slotDurationMinutes: 30,
    isVerified: true,
    schedule: [
      { dayOfWeek: 1, startTime: "08:00", endTime: "16:00" },
      { dayOfWeek: 2, startTime: "08:00", endTime: "16:00" },
      { dayOfWeek: 3, startTime: "08:00", endTime: "16:00" },
      { dayOfWeek: 4, startTime: "08:00", endTime: "16:00" },
      { dayOfWeek: 5, startTime: "08:00", endTime: "16:00" },
    ],
  },
  {
    email: "dr.delacruz@hilom.dev",
    password: "Doctor1234",
    fullName: "Dr. Ramon Dela Cruz",
    specialization: "Dermatology",
    bio: "Dermatologist specializing in medical and cosmetic skin conditions. 12 years of experience treating acne, psoriasis, and performing skin cancer screenings.",
    yearsOfExperience: 12,
    consultationFee: "900.00",
    clinicAddress: "321 Taft Avenue, Manila",
    slotDurationMinutes: 30,
    isVerified: true,
    schedule: [
      { dayOfWeek: 2, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 3, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 4, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 5, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 6, startTime: "10:00", endTime: "14:00" },
    ],
  },
  {
    email: "dr.lim@hilom.dev",
    password: "Doctor1234",
    fullName: "Dr. Sofia Lim",
    specialization: "OB-GYN",
    bio: "Obstetrician-gynecologist with 7 years of experience in prenatal care, high-risk pregnancies, and minimally invasive gynecologic surgery.",
    yearsOfExperience: 7,
    consultationFee: "1000.00",
    clinicAddress: "654 EDSA, Mandaluyong City",
    slotDurationMinutes: 30,
    isVerified: true,
    schedule: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
    ],
  },
  {
    email: "dr.torres@hilom.dev",
    password: "Doctor1234",
    fullName: "Dr. Miguel Torres",
    specialization: "Orthopedics",
    bio: "Orthopedic surgeon with 20 years of experience in joint replacement and sports injuries. Former team physician of the Philippine national basketball team.",
    yearsOfExperience: 20,
    consultationFee: "1500.00",
    clinicAddress: "987 Shaw Boulevard, Pasig City",
    slotDurationMinutes: 60,
    isVerified: true,
    schedule: [
      { dayOfWeek: 1, startTime: "08:00", endTime: "12:00" },
      { dayOfWeek: 2, startTime: "08:00", endTime: "12:00" },
      { dayOfWeek: 3, startTime: "08:00", endTime: "12:00" },
      { dayOfWeek: 4, startTime: "08:00", endTime: "12:00" },
      { dayOfWeek: 5, startTime: "08:00", endTime: "12:00" },
    ],
  },
  // Unverified — for admin verification queue demo
  {
    email: "dr.bautista@hilom.dev",
    password: "Doctor1234",
    fullName: "Dr. Elena Bautista",
    specialization: "Neurology",
    bio: "Neurologist specializing in epilepsy, stroke, and neurodegenerative diseases. Currently completing subspecialty training in movement disorders.",
    yearsOfExperience: 6,
    consultationFee: "1100.00",
    clinicAddress: "147 Commonwealth Avenue, Quezon City",
    slotDurationMinutes: 60,
    isVerified: false,
    schedule: [],
  },
  {
    email: "dr.ramos@hilom.dev",
    password: "Doctor1234",
    fullName: "Dr. Carlos Ramos",
    specialization: "Psychiatry",
    bio: "Psychiatrist focused on mood disorders, anxiety, and addiction medicine. Trained at the UP College of Medicine.",
    yearsOfExperience: 5,
    consultationFee: "1000.00",
    clinicAddress: "258 Katipunan Avenue, Quezon City",
    slotDurationMinutes: 60,
    isVerified: false,
    schedule: [],
  },
];

// Review plan per doctor: each entry becomes one completed appointment + one review
type ReviewEntry = {
  pIdx: number;
  dAgo: number;
  start: string;
  end: string;
  rating: number;
  comment: string;
};
const REVIEW_PLAN: Record<string, ReviewEntry[]> = {
  "dr.santos@hilom.dev": [
    {
      pIdx: 0,
      dAgo: 56,
      start: "09:00:00",
      end: "09:30:00",
      rating: 5,
      comment: "Very thorough and caring. Took time to explain everything.",
    },
    {
      pIdx: 1,
      dAgo: 49,
      start: "09:30:00",
      end: "10:00:00",
      rating: 5,
      comment: "Excellent experience! Highly recommend.",
    },
    {
      pIdx: 0,
      dAgo: 42,
      start: "10:00:00",
      end: "10:30:00",
      rating: 4,
      comment: "Great doctor, slight wait time but worth it.",
    },
    {
      pIdx: 1,
      dAgo: 35,
      start: "10:30:00",
      end: "11:00:00",
      rating: 5,
      comment: "Best GP I've visited. Very attentive.",
    },
    {
      pIdx: 0,
      dAgo: 28,
      start: "11:00:00",
      end: "11:30:00",
      rating: 4,
      comment: "Good consultation, answered all my questions.",
    },
    {
      pIdx: 1,
      dAgo: 21,
      start: "11:30:00",
      end: "12:00:00",
      rating: 3,
      comment: "Average experience, felt rushed.",
    },
    {
      pIdx: 0,
      dAgo: 14,
      start: "13:00:00",
      end: "13:30:00",
      rating: 5,
      comment: "Wonderful doctor. Really listens to patients.",
    },
  ],
  "dr.reyes@hilom.dev": [
    {
      pIdx: 0,
      dAgo: 56,
      start: "09:00:00",
      end: "10:00:00",
      rating: 5,
      comment: "Dr. Reyes diagnosed my condition immediately. Exceptional.",
    },
    {
      pIdx: 1,
      dAgo: 49,
      start: "09:00:00",
      end: "10:00:00",
      rating: 5,
      comment: "World-class cardiologist. I feel safe under his care.",
    },
    {
      pIdx: 0,
      dAgo: 42,
      start: "10:00:00",
      end: "11:00:00",
      rating: 4,
      comment: "Very knowledgeable. Explained my ECG results clearly.",
    },
    {
      pIdx: 1,
      dAgo: 35,
      start: "10:00:00",
      end: "11:00:00",
      rating: 5,
      comment: "Life-changing consultation. Finally found the right treatment.",
    },
    {
      pIdx: 0,
      dAgo: 28,
      start: "11:00:00",
      end: "12:00:00",
      rating: 4,
      comment: "Professional and thorough.",
    },
    {
      pIdx: 1,
      dAgo: 21,
      start: "11:00:00",
      end: "12:00:00",
      rating: 2,
      comment: "Long wait and felt rushed during the consultation.",
    },
  ],
  "dr.cruz@hilom.dev": [
    {
      pIdx: 0,
      dAgo: 49,
      start: "08:00:00",
      end: "08:30:00",
      rating: 5,
      comment: "Amazing with kids! My son was so comfortable.",
    },
    {
      pIdx: 1,
      dAgo: 42,
      start: "08:30:00",
      end: "09:00:00",
      rating: 5,
      comment: "So gentle and patient. Best pediatrician we've had.",
    },
    {
      pIdx: 0,
      dAgo: 35,
      start: "09:00:00",
      end: "09:30:00",
      rating: 5,
      comment: "My daughter asks to see Dr. Cruz again. Wonderful!",
    },
    {
      pIdx: 1,
      dAgo: 28,
      start: "09:30:00",
      end: "10:00:00",
      rating: 5,
      comment: "Thorough and caring. Explained everything clearly.",
    },
    {
      pIdx: 0,
      dAgo: 21,
      start: "10:00:00",
      end: "10:30:00",
      rating: 4,
      comment: "Very attentive and professional.",
    },
  ],
  "dr.lim@hilom.dev": [
    {
      pIdx: 0,
      dAgo: 56,
      start: "09:00:00",
      end: "09:30:00",
      rating: 5,
      comment: "Dr. Lim made me feel at ease throughout my pregnancy.",
    },
    {
      pIdx: 1,
      dAgo: 49,
      start: "09:30:00",
      end: "10:00:00",
      rating: 4,
      comment: "Professional and knowledgeable. Good experience overall.",
    },
    {
      pIdx: 0,
      dAgo: 42,
      start: "10:00:00",
      end: "10:30:00",
      rating: 5,
      comment: "Best OB in the city. Highly recommend!",
    },
    {
      pIdx: 1,
      dAgo: 35,
      start: "10:30:00",
      end: "11:00:00",
      rating: 3,
      comment: "Decent but felt like she was always in a hurry.",
    },
    {
      pIdx: 0,
      dAgo: 28,
      start: "11:00:00",
      end: "11:30:00",
      rating: 1,
      comment: "Disappointing. Did not explain my results properly.",
    },
  ],
};

// ─── seed ────────────────────────────────────────────────────────────────────

const seed = async () => {
  // Idempotency check — skip if already seeded
  const existing = await db.query.users.findFirst({
    where: eq(users.email, "dr.santos@hilom.dev"),
  });
  if (existing) {
    logger.info("seedAll: already seeded — skipping");
    await pool.end();
    process.exit(0);
  }

  logger.info("seedAll: starting...");

  // 1. Specializations
  await db.insert(specializations).values(SPECS).onConflictDoNothing();
  logger.info("  ✓ specializations");

  // Load spec map
  const specRows = await db.query.specializations.findMany();
  const specMap = Object.fromEntries(specRows.map((s) => [s.name, s.id]));

  // 2. Admin
  const adminExists = await db.query.users.findFirst({
    where: eq(users.email, ADMIN.email),
  });
  if (!adminExists) {
    await db.insert(users).values({
      email: ADMIN.email,
      passwordHash: await hashPassword(ADMIN.password),
      role: "admin",
      fullName: ADMIN.fullName,
      emailVerifiedAt: new Date(),
    });
  }
  logger.info("  ✓ admin");

  // 3. Seed patients
  const patientIds: string[] = [];
  for (const p of SEED_PATIENTS) {
    const ex = await db.query.users.findFirst({
      where: eq(users.email, p.email),
    });
    if (ex) {
      patientIds.push(ex.id);
    } else {
      const [row] = await db
        .insert(users)
        .values({
          email: p.email,
          passwordHash: await hashPassword(p.password),
          role: "patient",
          fullName: p.fullName,
          emailVerifiedAt: new Date(),
        })
        .returning();
      if (!row) throw new Error(`Failed to insert patient ${p.email}`);
      patientIds.push(row.id);
    }
  }
  logger.info("  ✓ seed patients");

  // 4. Doctors + profiles + schedules
  const doctorProfileMap: Record<
    string,
    { userId: string; profileId: string }
  > = {};

  for (const d of DOCTORS) {
    const specId = specMap[d.specialization];
    if (!specId)
      throw new Error(`Specialization not found: ${d.specialization}`);

    await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: d.email,
          passwordHash: await hashPassword(d.password),
          role: "doctor",
          fullName: d.fullName,
          emailVerifiedAt: new Date(),
        })
        .returning();
      if (!user) throw new Error(`Failed to insert doctor ${d.email}`);

      const [profile] = await tx
        .insert(doctorProfiles)
        .values({
          userId: user.id,
          specializationId: specId,
          bio: d.bio,
          yearsOfExperience: d.yearsOfExperience,
          consultationFee: d.consultationFee,
          clinicAddress: d.clinicAddress,
          slotDurationMinutes: d.slotDurationMinutes,
          isVerified: d.isVerified,
        })
        .returning();
      if (!profile) throw new Error(`Failed to insert profile for ${d.email}`);

      if (d.schedule.length > 0) {
        await tx.insert(doctorSchedules).values(
          d.schedule.map((s) => ({
            doctorId: profile.id,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            isActive: true,
          })),
        );
      }

      doctorProfileMap[d.email] = { userId: user.id, profileId: profile.id };
    });
  }
  logger.info("  ✓ doctors, profiles, schedules");

  // 5. Appointments + reviews
  for (const [docEmail, entries] of Object.entries(REVIEW_PLAN)) {
    const doc = doctorProfileMap[docEmail];
    if (!doc) continue;

    const ratings: number[] = [];

    for (const e of entries) {
      const patientId = patientIds[e.pIdx];
      if (!patientId) continue;

      const [appt] = await db
        .insert(appointments)
        .values({
          patientId,
          doctorId: doc.profileId,
          appointmentDate: daysAgo(e.dAgo),
          slotStart: e.start,
          slotEnd: e.end,
          status: "completed",
          reason: "Regular consultation",
        })
        .returning();
      if (!appt) continue;

      await db.insert(reviews).values({
        appointmentId: appt.id,
        patientId,
        doctorId: doc.userId,
        rating: e.rating,
        comment: e.comment,
      });

      ratings.push(e.rating);
    }

    // Update averageRating on the doctor profile
    if (ratings.length > 0) {
      await db
        .update(doctorProfiles)
        .set({ averageRating: avg(ratings) })
        .where(eq(doctorProfiles.id, doc.profileId));
    }
  }
  logger.info("  ✓ appointments, reviews, ratings");

  // Summary
  logger.info("seedAll: done!");
  logger.info("  Admin     admin@hilom.dev / Admin1234");
  logger.info("  Patients  patient1@hilom.dev / Patient1234");
  logger.info("            patient2@hilom.dev / Patient1234");
  logger.info(
    "  Doctors   dr.santos@hilom.dev through dr.ramos@hilom.dev / Doctor1234",
  );
  logger.info("  6 verified doctors, 2 unverified (in admin queue)");

  await pool.end();
  process.exit(0);
};

seed().catch((err: unknown) => {
  logger.error({ err }, "seedAll failed");
  process.exit(1);
});
