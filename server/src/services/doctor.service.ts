import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../config/db";
import { doctorProfiles, specializations, users } from "../db/schema";
import {
  DOCTOR_PAGE_SIZE,
  type ListDoctorsQuery,
} from "../schemas/doctor.schema";

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
  const conditions: SQL[] = [];

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
