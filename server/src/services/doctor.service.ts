import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../config/db";
import {
  appointments,
  doctorProfiles,
  payments,
  reviews,
  specializations,
  users,
} from "../db/schema";
import {
  DOCTOR_PAGE_SIZE,
  type ListDoctorsQuery,
} from "../schemas/doctor.schema";
import { todayInManila } from "../utils/manilaTime";
import { AppError } from "../utils/AppError";

export interface PublicDoctor {
  id: string;
  userId: string;
  specializationId: number;
  specializationName: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  yearsOfExperience: number;
  consultationFee: string;
  clinicAddress: string | null;
  slotDurationMinutes: number;
  isVerified: boolean;
  averageRating: string | null;
}

export interface PublicDoctorsResult {
  doctors: PublicDoctor[];
  total: number;
  page: number;
  pageSize: number;
}

const selectFields = {
  id: doctorProfiles.id,
  userId: doctorProfiles.userId,
  specializationId: doctorProfiles.specializationId,
  specializationName: specializations.name,
  fullName: users.fullName,
  avatarUrl: users.avatarUrl,
  bio: doctorProfiles.bio,
  yearsOfExperience: doctorProfiles.yearsOfExperience,
  consultationFee: doctorProfiles.consultationFee,
  clinicAddress: doctorProfiles.clinicAddress,
  slotDurationMinutes: doctorProfiles.slotDurationMinutes,
  isVerified: doctorProfiles.isVerified,
  averageRating: doctorProfiles.averageRating,
};

const buildWhere = (query: ListDoctorsQuery): SQL | undefined => {
  const conditions: SQL[] = [eq(doctorProfiles.isVerified, true)];

  if (query.specializationId?.length) {
    conditions.push(
      inArray(doctorProfiles.specializationId, query.specializationId),
    );
  }

  if (query.search) {
    conditions.push(ilike(users.fullName, `%${query.search}%`));
  }

  if (query.maxFee !== undefined) {
    conditions.push(
      sql`${doctorProfiles.consultationFee}::numeric <= ${query.maxFee}`,
    );
  }

  if (query.minRating !== undefined) {
    conditions.push(
      sql`COALESCE(${doctorProfiles.averageRating}::numeric, 0) >= ${query.minRating}`,
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
};

export const findPublicDoctors = async (
  query: ListDoctorsQuery,
): Promise<PublicDoctorsResult> => {
  const where = buildWhere(query);

  const orderBy =
    query.sort === "fee"
      ? asc(sql`${doctorProfiles.consultationFee}::numeric`)
      : query.sort === "name"
        ? asc(users.fullName)
        : desc(sql`COALESCE(${doctorProfiles.averageRating}::numeric, 0)`);

  const [countRows, doctors] = await Promise.all([
    db
      .select({ count: count() })
      .from(doctorProfiles)
      .innerJoin(users, eq(doctorProfiles.userId, users.id))
      .innerJoin(
        specializations,
        eq(doctorProfiles.specializationId, specializations.id),
      )
      .where(where),
    db
      .select(selectFields)
      .from(doctorProfiles)
      .innerJoin(users, eq(doctorProfiles.userId, users.id))
      .innerJoin(
        specializations,
        eq(doctorProfiles.specializationId, specializations.id),
      )
      .where(where)
      .orderBy(orderBy)
      .limit(DOCTOR_PAGE_SIZE)
      .offset((query.page - 1) * DOCTOR_PAGE_SIZE),
  ]);

  return {
    doctors,
    total: countRows[0]?.count ?? 0,
    page: query.page,
    pageSize: DOCTOR_PAGE_SIZE,
  };
};

export const findPublicDoctorById = async (
  id: string,
): Promise<PublicDoctor | null> => {
  const rows = await db
    .select(selectFields)
    .from(doctorProfiles)
    .innerJoin(users, eq(doctorProfiles.userId, users.id))
    .innerJoin(
      specializations,
      eq(doctorProfiles.specializationId, specializations.id),
    )
    .where(eq(doctorProfiles.id, id))
    .limit(1);

  return rows[0] ?? null;
};

export interface DoctorStatsScheduleRow {
  id: string;
  patientName: string;
  slotStart: string;
  slotEnd: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  paymentStatus: "pending" | "escrowed" | "released" | "refunded" | null;
}

export interface DoctorStats {
  todaySchedule: DoctorStatsScheduleRow[];
  pendingConfirmations: number;
  hasStalePending: boolean;
  earnings: {
    last30Days: string;
    allTime: string;
    last7Days: { date: string; amount: string }[];
  };
  rating: { average: string | null; count: number };
}

const TODAY_SCHEDULE_LIMIT = 20;

const toHHMM = (t: string): string => t.slice(0, 5);

export const getDoctorStats = async (
  doctorUserId: string,
): Promise<DoctorStats> => {
  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, doctorUserId),
  });
  if (!profile) throw new AppError(404, "Doctor profile not found");

  const today = todayInManila();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
  sevenDaysAgo.setUTCHours(0, 0, 0, 0);
  const staleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    scheduleRows,
    pendingRows,
    earningsRows,
    reviewCountRows,
    dailyEarningsRows,
    stalePendingRows,
  ] = await Promise.all([
    db
      .select({
        id: appointments.id,
        patientName: users.fullName,
        slotStart: appointments.slotStart,
        slotEnd: appointments.slotEnd,
        status: appointments.status,
        paymentStatus: payments.status,
      })
      .from(appointments)
      .innerJoin(users, eq(users.id, appointments.patientId))
      .leftJoin(payments, eq(payments.appointmentId, appointments.id))
      .where(
        and(
          eq(appointments.doctorId, profile.id),
          eq(appointments.appointmentDate, today),
          ne(appointments.status, "cancelled"),
        ),
      )
      .orderBy(asc(appointments.slotStart))
      .limit(TODAY_SCHEDULE_LIMIT),

    db
      .select({ count: count() })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, profile.id),
          eq(appointments.status, "pending"),
        ),
      ),

    db
      .select({
        last30Days: sql<string>`COALESCE(SUM(CASE WHEN ${payments.releasedAt} >= ${thirtyDaysAgo} THEN ${payments.amount} ELSE 0 END), 0)::text`,
        allTime: sql<string>`COALESCE(SUM(${payments.amount}), 0)::text`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.doctorId, doctorUserId),
          eq(payments.status, "released"),
        ),
      ),

    db
      .select({ count: count() })
      .from(reviews)
      .where(eq(reviews.doctorId, doctorUserId)),

    db
      .select({
        date: sql<string>`date_trunc('day', ${payments.releasedAt})::date`,
        amount: sql<string>`SUM(${payments.amount})::text`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.doctorId, doctorUserId),
          eq(payments.status, "released"),
          gte(payments.releasedAt, sevenDaysAgo),
        ),
      )
      .groupBy(sql`date_trunc('day', ${payments.releasedAt})`)
      .orderBy(sql`date_trunc('day', ${payments.releasedAt})`),

    db
      .select({ count: count() })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, profile.id),
          eq(appointments.status, "pending"),
          lt(appointments.createdAt, staleCutoff),
        ),
      ),
  ]);

  return {
    todaySchedule: scheduleRows.map((r) => ({
      ...r,
      slotStart: toHHMM(r.slotStart),
      slotEnd: toHHMM(r.slotEnd),
    })),
    pendingConfirmations: pendingRows[0]?.count ?? 0,
    hasStalePending: (stalePendingRows[0]?.count ?? 0) > 0,
    earnings: {
      last30Days: earningsRows[0]?.last30Days ?? "0",
      allTime: earningsRows[0]?.allTime ?? "0",
      last7Days: dailyEarningsRows.map((r) => ({
        date: r.date,
        amount: r.amount,
      })),
    },
    rating: {
      average: profile.averageRating,
      count: reviewCountRows[0]?.count ?? 0,
    },
  };
};
