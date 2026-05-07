import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "../config/db";
import { logger } from "../config/logger";
import {
  users,
  doctorProfiles,
  appointments,
  payments,
  prescriptions,
  prescriptionMedications,
  conversations,
  messages,
} from "./schema";

// ─── helpers ─────────────────────────────────────────────────────────────────

const daysFromNow = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

// ─── seed ────────────────────────────────────────────────────────────────────

const seed = async () => {
  // ── 1. Look up seed patient IDs ──────────────────────────────────────────
  const patientRows = await db.query.users.findMany({
    where: inArray(users.email, ["patient1@hilom.dev", "patient2@hilom.dev"]),
  });
  const p1 = patientRows.find((u) => u.email === "patient1@hilom.dev");
  const p2 = patientRows.find((u) => u.email === "patient2@hilom.dev");
  if (!p1 || !p2) {
    logger.error("seedExtras: run db:seed:all first");
    await pool.end();
    process.exit(1);
  }

  // ── 2. Look up doctor user IDs + profile IDs + fees ──────────────────────
  const doctorEmails = [
    "dr.santos@hilom.dev",
    "dr.reyes@hilom.dev",
    "dr.cruz@hilom.dev",
    "dr.lim@hilom.dev",
    "dr.torres@hilom.dev",
  ];
  const doctorUserRows = await db.query.users.findMany({
    where: inArray(users.email, doctorEmails),
  });
  const doctorProfileRows = await db.query.doctorProfiles.findMany({
    where: inArray(
      doctorProfiles.userId,
      doctorUserRows.map((u) => u.id),
    ),
  });

  const doc = (email: string) => {
    const u = doctorUserRows.find((r) => r.email === email)!;
    const p = doctorProfileRows.find((r) => r.userId === u.id)!;
    return { userId: u.id, profileId: p.id, fee: p.consultationFee };
  };

  const santos = doc("dr.santos@hilom.dev");
  const reyes = doc("dr.reyes@hilom.dev");
  const cruz = doc("dr.cruz@hilom.dev");
  const lim = doc("dr.lim@hilom.dev");
  const torres = doc("dr.torres@hilom.dev");

  // Idempotency — check if extras already seeded
  const alreadyDone = await db.query.appointments.findFirst({
    where: and(
      eq(appointments.patientId, p1.id),
      eq(appointments.status, "pending"),
    ),
  });
  if (alreadyDone) {
    logger.info("seedExtras: already seeded — skipping");
    await pool.end();
    process.exit(0);
  }

  logger.info("seedExtras: starting...");

  // ── 3. Pending appointments ───────────────────────────────────────────────
  const pendingAppts = await db
    .insert(appointments)
    .values([
      {
        patientId: p1.id,
        doctorId: santos.profileId,
        appointmentDate: daysFromNow(3),
        slotStart: "09:00:00",
        slotEnd: "09:30:00",
        status: "pending",
        reason: "Annual check-up and blood pressure monitoring",
      },
      {
        patientId: p2.id,
        doctorId: reyes.profileId,
        appointmentDate: daysFromNow(5),
        slotStart: "10:00:00",
        slotEnd: "11:00:00",
        status: "pending",
        reason: "Chest pain and palpitations follow-up",
      },
      {
        patientId: p1.id,
        doctorId: cruz.profileId,
        appointmentDate: daysFromNow(7),
        slotStart: "08:00:00",
        slotEnd: "08:30:00",
        status: "pending",
        reason: "Child vaccination schedule",
      },
    ])
    .returning();

  // Pending payments for pending appointments
  for (const appt of pendingAppts) {
    const fee =
      appt.doctorId === santos.profileId
        ? santos.fee
        : appt.doctorId === reyes.profileId
          ? reyes.fee
          : cruz.fee;
    const patId = appt.patientId === p1.id ? p1.id : p2.id;
    const docUserId =
      appt.doctorId === santos.profileId
        ? santos.userId
        : appt.doctorId === reyes.profileId
          ? reyes.userId
          : cruz.userId;
    await db.insert(payments).values({
      appointmentId: appt.id,
      patientId: patId,
      doctorId: docUserId,
      amount: fee,
      status: "pending",
    });
  }
  logger.info("  ✓ pending appointments + payments");

  // ── 4. Confirmed appointments + conversations + messages ──────────────────
  const [confirmedLim] = await db
    .insert(appointments)
    .values({
      patientId: p1.id,
      doctorId: lim.profileId,
      appointmentDate: daysFromNow(4),
      slotStart: "09:00:00",
      slotEnd: "09:30:00",
      status: "confirmed",
      reason: "Prenatal check-up, second trimester",
    })
    .returning();

  const [confirmedTorres] = await db
    .insert(appointments)
    .values({
      patientId: p2.id,
      doctorId: torres.profileId,
      appointmentDate: daysFromNow(6),
      slotStart: "08:00:00",
      slotEnd: "09:00:00",
      status: "confirmed",
      reason: "Knee pain after sports injury",
    })
    .returning();

  if (!confirmedLim || !confirmedTorres)
    throw new Error("Failed confirmed appointments");

  // Escrowed payments for confirmed appointments (patient has paid)
  await db.insert(payments).values([
    {
      appointmentId: confirmedLim.id,
      patientId: p1.id,
      doctorId: lim.userId,
      amount: lim.fee,
      status: "escrowed",
      paidAt: hoursAgo(12),
    },
    {
      appointmentId: confirmedTorres.id,
      patientId: p2.id,
      doctorId: torres.userId,
      amount: torres.fee,
      status: "escrowed",
      paidAt: hoursAgo(8),
    },
  ]);

  // Conversations
  const [convLim] = await db
    .insert(conversations)
    .values({
      appointmentId: confirmedLim.id,
      patientId: p1.id,
      doctorId: lim.userId,
    })
    .returning();

  const [convTorres] = await db
    .insert(conversations)
    .values({
      appointmentId: confirmedTorres.id,
      patientId: p2.id,
      doctorId: torres.userId,
    })
    .returning();

  if (!convLim || !convTorres) throw new Error("Failed conversations");

  // Messages — Ana Reyes + Dr. Lim
  await db.insert(messages).values([
    {
      conversationId: convLim.id,
      senderId: p1.id,
      content:
        "Hello Dr. Lim! I just wanted to confirm our appointment. Is there anything I should prepare?",
      isRead: true,
      createdAt: hoursAgo(10),
    },
    {
      conversationId: convLim.id,
      senderId: lim.userId,
      content:
        "Hello Ana! Yes, your appointment is confirmed. Please bring your previous ultrasound results and any prenatal vitamins you are currently taking.",
      isRead: true,
      createdAt: hoursAgo(9),
    },
    {
      conversationId: convLim.id,
      senderId: p1.id,
      content: "Perfect, I have everything ready. Thank you, Doc!",
      isRead: true,
      createdAt: hoursAgo(9),
    },
    {
      conversationId: convLim.id,
      senderId: lim.userId,
      content: "Great! See you then. Take care.",
      isRead: false,
      createdAt: hoursAgo(8),
    },
  ]);

  // Messages — Carlos Santos + Dr. Torres
  await db.insert(messages).values([
    {
      conversationId: convTorres.id,
      senderId: p2.id,
      content:
        "Good day Dr. Torres. I have a quick question before our appointment.",
      isRead: true,
      createdAt: hoursAgo(6),
    },
    {
      conversationId: convTorres.id,
      senderId: torres.userId,
      content: "Of course, Carlos. What would you like to know?",
      isRead: true,
      createdAt: hoursAgo(6),
    },
    {
      conversationId: convTorres.id,
      senderId: p2.id,
      content:
        "Should I stop taking ibuprofen before the consultation? I have been using it for the knee pain.",
      isRead: true,
      createdAt: hoursAgo(5),
    },
    {
      conversationId: convTorres.id,
      senderId: torres.userId,
      content:
        "Yes, please avoid NSAIDs for at least 24 hours before your appointment. Ice the knee instead if the pain is manageable.",
      isRead: true,
      createdAt: hoursAgo(5),
    },
    {
      conversationId: convTorres.id,
      senderId: p2.id,
      content: "Got it. Thank you, Doc. See you on the day.",
      isRead: false,
      createdAt: hoursAgo(4),
    },
  ]);

  logger.info(
    "  ✓ confirmed appointments + payments + conversations + messages",
  );

  // ── 5. Payments for existing completed appointments ───────────────────────
  const completedAppts = await db.query.appointments.findMany({
    where: and(
      inArray(appointments.patientId, [p1.id, p2.id]),
      eq(appointments.status, "completed"),
    ),
  });

  const feeMap: Record<string, string> = {
    [santos.profileId]: santos.fee,
    [reyes.profileId]: reyes.fee,
    [cruz.profileId]: cruz.fee,
    [lim.profileId]: lim.fee,
  };
  const userMap: Record<string, string> = {
    [santos.profileId]: santos.userId,
    [reyes.profileId]: reyes.userId,
    [cruz.profileId]: cruz.userId,
    [lim.profileId]: lim.userId,
  };

  for (const appt of completedAppts) {
    const amount = feeMap[appt.doctorId];
    const docUserId = userMap[appt.doctorId];
    if (!amount || !docUserId) continue;

    const apptDate = new Date(appt.appointmentDate);
    const paidAt = new Date(apptDate.getTime() + 2 * 60 * 60 * 1000);
    const releasedAt = new Date(apptDate.getTime() + 24 * 60 * 60 * 1000);

    await db.insert(payments).values({
      appointmentId: appt.id,
      patientId: appt.patientId,
      doctorId: docUserId,
      amount,
      status: "released",
      paidAt,
      releasedAt,
    });
  }
  logger.info("  ✓ payments for completed appointments");

  // ── 6. Prescriptions for some completed appointments ─────────────────────
  // Pick the oldest completed appointment per doctor pair
  const santosApt = completedAppts
    .filter((a) => a.doctorId === santos.profileId && a.patientId === p1.id)
    .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate))[0];

  const reyesApt = completedAppts
    .filter((a) => a.doctorId === reyes.profileId && a.patientId === p2.id)
    .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate))[0];

  const cruzApt = completedAppts
    .filter((a) => a.doctorId === cruz.profileId && a.patientId === p1.id)
    .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate))[0];

  const limApt = completedAppts
    .filter((a) => a.doctorId === lim.profileId && a.patientId === p2.id)
    .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate))[0];

  type PrescriptionMed = {
    medicationName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string | null;
  };
  type PrescriptionTarget = {
    appt: (typeof completedAppts)[number];
    doctorUserId: string;
    notes: string;
    medications: PrescriptionMed[];
  };

  const prescriptionTargets: PrescriptionTarget[] = [
    santosApt && {
      appt: santosApt,
      doctorUserId: santos.userId,
      notes: "Take with food. Return for follow-up in 2 weeks.",
      medications: [
        {
          medicationName: "Amoxicillin",
          dosage: "500mg",
          frequency: "3x daily",
          duration: "7 days",
          instructions: "Take with food to reduce stomach upset",
        },
        {
          medicationName: "Cetirizine",
          dosage: "10mg",
          frequency: "Once daily",
          duration: "14 days",
          instructions: "Take at bedtime to reduce drowsiness",
        },
      ],
    },
    reyesApt && {
      appt: reyesApt,
      doctorUserId: reyes.userId,
      notes: "Monitor blood pressure daily. Reduce salt and fat intake.",
      medications: [
        {
          medicationName: "Amlodipine",
          dosage: "5mg",
          frequency: "Once daily",
          duration: "30 days",
          instructions: "Take at the same time each day",
        },
        {
          medicationName: "Atorvastatin",
          dosage: "20mg",
          frequency: "Once daily at night",
          duration: "30 days",
          instructions: "Avoid grapefruit juice",
        },
        {
          medicationName: "Aspirin",
          dosage: "80mg",
          frequency: "Once daily",
          duration: "30 days",
          instructions: "Take after meals",
        },
      ],
    },
    cruzApt && {
      appt: cruzApt,
      doctorUserId: cruz.userId,
      notes:
        "Keep child well-hydrated. Return if fever persists beyond 3 days.",
      medications: [
        {
          medicationName: "Paracetamol Syrup",
          dosage: "5ml (120mg/5ml)",
          frequency: "Every 6 hours as needed",
          duration: "5 days",
          instructions: "For fever above 38°C only",
        },
        {
          medicationName: "Salbutamol Nebule",
          dosage: "0.15mg/kg",
          frequency: "Every 6 hours",
          duration: "3 days",
          instructions: "Use with nebulizer only",
        },
      ],
    },
    limApt && {
      appt: limApt,
      doctorUserId: lim.userId,
      notes:
        "Continue prenatal vitamins. Schedule glucose tolerance test next visit.",
      medications: [
        {
          medicationName: "Ferrous Sulfate",
          dosage: "325mg",
          frequency: "Once daily",
          duration: "30 days",
          instructions: "Take on an empty stomach with vitamin C",
        },
        {
          medicationName: "Folic Acid",
          dosage: "5mg",
          frequency: "Once daily",
          duration: "30 days",
          instructions: null,
        },
        {
          medicationName: "Calcium Carbonate",
          dosage: "500mg",
          frequency: "Twice daily",
          duration: "30 days",
          instructions: "Take with meals",
        },
      ],
    },
  ].filter((x): x is PrescriptionTarget => Boolean(x));

  for (const target of prescriptionTargets) {
    const [rx] = await db
      .insert(prescriptions)
      .values({
        appointmentId: target.appt.id,
        doctorId: target.doctorUserId,
        patientId: target.appt.patientId,
        notes: target.notes,
      })
      .returning();

    if (!rx) continue;

    await db.insert(prescriptionMedications).values(
      target.medications.map((m) => ({
        prescriptionId: rx.id,
        medicationName: m.medicationName,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions ?? undefined,
      })),
    );
  }
  logger.info("  ✓ prescriptions + medications");

  logger.info("seedExtras: done!");
  logger.info("  3 pending appointments (Santos, Reyes, Cruz)");
  logger.info("  2 confirmed appointments with chat (Lim, Torres)");
  logger.info("  Payments for all appointments");
  logger.info("  4 prescriptions with medications");

  await pool.end();
  process.exit(0);
};

seed().catch((err: unknown) => {
  logger.error({ err }, "seedExtras failed");
  process.exit(1);
});
