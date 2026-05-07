import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "../config/db";
import {
  appointments,
  doctorProfiles,
  payments,
  specializations,
  users,
} from "../db/schema";
import { AppError } from "../utils/AppError";
import {
  ADMIN_PAGE_SIZE,
  type ListUnverifiedDoctorsQuery,
  type ListUsersQuery,
} from "../schemas/admin.schema";

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string;
  role: "patient" | "doctor" | "admin";
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

export interface AdminListResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const listUsers = async (
  query: ListUsersQuery,
): Promise<AdminListResult<AdminUserRow>> => {
  const conditions: SQL[] = [];
  if (query.role) conditions.push(eq(users.role, query.role));
  if (query.search) {
    const term = `%${query.search}%`;
    const search = or(ilike(users.email, term), ilike(users.fullName, term));
    if (search) conditions.push(search);
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [countRows, rows] = await Promise.all([
    db.select({ count: count() }).from(users).where(where),
    db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        emailVerifiedAt: users.emailVerifiedAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((query.page - 1) * ADMIN_PAGE_SIZE),
  ]);

  return {
    rows,
    total: countRows[0]?.count ?? 0,
    page: query.page,
    pageSize: ADMIN_PAGE_SIZE,
  };
};

export interface UnverifiedDoctorRow {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  specializationName: string;
  yearsOfExperience: number;
  consultationFee: string;
  bio: string | null;
  createdAt: Date;
}

export const listUnverifiedDoctors = async (
  query: ListUnverifiedDoctorsQuery,
): Promise<AdminListResult<UnverifiedDoctorRow>> => {
  const where = eq(doctorProfiles.isVerified, false);

  const [countRows, rows] = await Promise.all([
    db
      .select({ count: count() })
      .from(doctorProfiles)
      .innerJoin(users, eq(doctorProfiles.userId, users.id))
      .where(where),
    db
      .select({
        id: doctorProfiles.id,
        userId: doctorProfiles.userId,
        email: users.email,
        fullName: users.fullName,
        specializationName: specializations.name,
        yearsOfExperience: doctorProfiles.yearsOfExperience,
        consultationFee: doctorProfiles.consultationFee,
        bio: doctorProfiles.bio,
        createdAt: doctorProfiles.createdAt,
      })
      .from(doctorProfiles)
      .innerJoin(users, eq(doctorProfiles.userId, users.id))
      .innerJoin(
        specializations,
        eq(doctorProfiles.specializationId, specializations.id),
      )
      .where(where)
      .orderBy(desc(doctorProfiles.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((query.page - 1) * ADMIN_PAGE_SIZE),
  ]);

  return {
    rows,
    total: countRows[0]?.count ?? 0,
    page: query.page,
    pageSize: ADMIN_PAGE_SIZE,
  };
};

export const setDoctorVerified = async (
  doctorProfileId: string,
  isVerified: boolean,
) => {
  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.id, doctorProfileId),
  });
  if (!profile) throw new AppError(404, "Doctor profile not found");

  const [updated] = await db
    .update(doctorProfiles)
    .set({ isVerified })
    .where(eq(doctorProfiles.id, doctorProfileId))
    .returning();
  return updated;
};

export interface PlatformStats {
  users: { total: number; patients: number; doctors: number; admins: number };
  appointments: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
  revenue: { released: string; escrowed: string };
  doctors: { unverified: number };
}

export const getPlatformStats = async (): Promise<PlatformStats> => {
  const userRows = await db
    .select({ role: users.role, count: count() })
    .from(users)
    .groupBy(users.role);

  const userBucket = { patients: 0, doctors: 0, admins: 0 };
  for (const row of userRows) {
    if (row.role === "patient") userBucket.patients = row.count;
    if (row.role === "doctor") userBucket.doctors = row.count;
    if (row.role === "admin") userBucket.admins = row.count;
  }
  const totalUsers =
    userBucket.patients + userBucket.doctors + userBucket.admins;

  const apptRows = await db
    .select({ status: appointments.status, count: count() })
    .from(appointments)
    .groupBy(appointments.status);

  const apptBucket = {
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const row of apptRows) {
    if (row.status === "pending") apptBucket.pending = row.count;
    if (row.status === "confirmed") apptBucket.confirmed = row.count;
    if (row.status === "completed") apptBucket.completed = row.count;
    if (row.status === "cancelled") apptBucket.cancelled = row.count;
  }
  const totalAppts =
    apptBucket.pending +
    apptBucket.confirmed +
    apptBucket.completed +
    apptBucket.cancelled;

  const revenueRows = await db
    .select({
      status: payments.status,
      sum: sql<string>`COALESCE(SUM(${payments.amount}), '0')::text`,
    })
    .from(payments)
    .groupBy(payments.status);

  let revenueReleased = "0";
  let revenueEscrowed = "0";
  for (const row of revenueRows) {
    if (row.status === "released") revenueReleased = row.sum;
    if (row.status === "escrowed") revenueEscrowed = row.sum;
  }

  const unverifiedRows = await db
    .select({ count: count() })
    .from(doctorProfiles)
    .where(eq(doctorProfiles.isVerified, false));

  return {
    users: { total: totalUsers, ...userBucket },
    appointments: { total: totalAppts, ...apptBucket },
    revenue: { released: revenueReleased, escrowed: revenueEscrowed },
    doctors: { unverified: unverifiedRows[0]?.count ?? 0 },
  };
};
