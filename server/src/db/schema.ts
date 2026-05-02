import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  timestamp,
  date,
  time,
  serial,
  unique,
} from "drizzle-orm/pg-core";

// Enums
export const userRoleEnum = pgEnum("user_role", ["patient", "doctor", "admin"]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "escrowed",
  "released",
  "refunded",
]);

// Tables
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  phone: varchar("phone", { length: 20 }),
  refreshTokenHash: text("refresh_token_hash"),
  emailVerifiedAt: timestamp("email_verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const specializations = pgTable("specializations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).unique().notNull(),
  description: text("description"),
  iconName: varchar("icon_name", { length: 50 }),
});

export const doctorProfiles = pgTable("doctor_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .unique()
    .notNull(),
  specializationId: integer("specialization_id")
    .references(() => specializations.id)
    .notNull(),
  bio: text("bio"),
  yearsOfExperience: integer("years_of_experience").default(0).notNull(),
  consultationFee: decimal("consultation_fee", {
    precision: 10,
    scale: 2,
  }).notNull(),
  clinicAddress: text("clinic_address"),
  slotDurationMinutes: integer("slot_duration_minutes").default(30).notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default(
    "0.00",
  ),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const doctorSchedules = pgTable(
  "doctor_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    doctorId: uuid("doctor_id")
      .references(() => doctorProfiles.id)
      .notNull(),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (table) => [unique("unique_doctor_day").on(table.doctorId, table.dayOfWeek)],
);

export const patientProfiles = pgTable("patient_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .unique()
    .notNull(),
  dateOfBirth: date("date_of_birth"),
  bloodType: varchar("blood_type", { length: 5 }),
  allergies: text("allergies"),
  emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id")
    .references(() => users.id)
    .notNull(),
  doctorId: uuid("doctor_id")
    .references(() => doctorProfiles.id)
    .notNull(),
  appointmentDate: date("appointment_date").notNull(),
  slotStart: time("slot_start").notNull(),
  slotEnd: time("slot_end").notNull(),
  status: appointmentStatusEnum("status").default("pending").notNull(),
  reason: text("reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  appointmentId: uuid("appointment_id")
    .references(() => appointments.id)
    .unique()
    .notNull(),
  patientId: uuid("patient_id")
    .references(() => users.id)
    .notNull(),
  doctorId: uuid("doctor_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id)
    .notNull(),
  senderId: uuid("sender_id")
    .references(() => users.id)
    .notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  appointmentId: uuid("appointment_id")
    .references(() => appointments.id)
    .notNull(),
  doctorId: uuid("doctor_id")
    .references(() => users.id)
    .notNull(),
  patientId: uuid("patient_id")
    .references(() => users.id)
    .notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const prescriptionMedications = pgTable("prescription_medications", {
  id: uuid("id").defaultRandom().primaryKey(),
  prescriptionId: uuid("prescription_id")
    .references(() => prescriptions.id)
    .notNull(),
  medicationName: varchar("medication_name", { length: 255 }).notNull(),
  dosage: varchar("dosage", { length: 100 }).notNull(),
  frequency: varchar("frequency", { length: 100 }).notNull(),
  duration: varchar("duration", { length: 100 }).notNull(),
  instructions: text("instructions"),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  appointmentId: uuid("appointment_id")
    .references(() => appointments.id)
    .notNull(),
  patientId: uuid("patient_id")
    .references(() => users.id)
    .notNull(),
  doctorId: uuid("doctor_id")
    .references(() => users.id)
    .notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  paymongoPaymentIntentId: varchar("paymongo_payment_intent_id", {
    length: 255,
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  releasedAt: timestamp("released_at"),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  appointmentId: uuid("appointment_id")
    .references(() => appointments.id)
    .unique()
    .notNull(),
  patientId: uuid("patient_id")
    .references(() => users.id)
    .notNull(),
  doctorId: uuid("doctor_id")
    .references(() => users.id)
    .notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
