import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "../config/db";
import { appointments, doctorProfiles, reviews, users } from "../db/schema";
import { AppError } from "../utils/AppError";
import {
  REVIEWS_PAGE_SIZE,
  type CreateReviewInput,
  type ListDoctorReviewsQuery,
} from "../schemas/review.schema";

export const createReview = async (
  patientId: string,
  appointmentId: string,
  input: CreateReviewInput,
) => {
  const appointment = await db.query.appointments.findFirst({
    where: eq(appointments.id, appointmentId),
  });
  if (!appointment) throw new AppError(404, "Appointment not found");

  if (appointment.patientId !== patientId) {
    throw new AppError(403, "Not authorized");
  }

  if (appointment.status !== "completed") {
    throw new AppError(400, "Appointment not completed yet");
  }

  const existing = await db.query.reviews.findFirst({
    where: eq(reviews.appointmentId, appointmentId),
  });
  if (existing) throw new AppError(409, "Already reviewed");

  // appointment.doctorId is doctorProfiles.id; reviews.doctorId is users.id
  const doctorProfileId = appointment.doctorId;
  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.id, doctorProfileId),
  });
  if (!profile) throw new AppError(404, "Doctor profile not found");
  const doctorUserId = profile.userId;

  return db.transaction(async (tx) => {
    const [review] = await tx
      .insert(reviews)
      .values({
        appointmentId,
        patientId,
        doctorId: doctorUserId,
        rating: input.rating,
        comment: input.comment ?? null,
      })
      .returning();

    await tx.execute(
      sql`UPDATE doctor_profiles
          SET average_rating = (
            SELECT ROUND(AVG(r.rating)::numeric, 2)
            FROM reviews r
            INNER JOIN doctor_profiles dp ON dp.user_id = r.doctor_id
            WHERE dp.id = ${doctorProfileId}
          )
          WHERE id = ${doctorProfileId}`,
    );

    return review;
  });
};

export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  patientName: string;
  createdAt: Date;
}

export interface PublicReviewsResult {
  reviews: PublicReview[];
  total: number;
  page: number;
  pageSize: number;
  averageRating: string | null;
  ratingCount: number;
}

export const listDoctorReviews = async (
  doctorProfileId: string,
  query: ListDoctorReviewsQuery,
): Promise<PublicReviewsResult> => {
  const profile = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.id, doctorProfileId),
  });
  if (!profile) throw new AppError(404, "Doctor not found");

  const where = eq(reviews.doctorId, profile.userId);

  const [countRows, rows] = await Promise.all([
    db.select({ count: count() }).from(reviews).where(where),
    db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        patientName: users.fullName,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.patientId))
      .where(where)
      .orderBy(desc(reviews.createdAt))
      .limit(REVIEWS_PAGE_SIZE)
      .offset((query.page - 1) * REVIEWS_PAGE_SIZE),
  ]);

  return {
    reviews: rows,
    total: countRows[0]?.count ?? 0,
    page: query.page,
    pageSize: REVIEWS_PAGE_SIZE,
    averageRating: profile.averageRating,
    ratingCount: countRows[0]?.count ?? 0,
  };
};
