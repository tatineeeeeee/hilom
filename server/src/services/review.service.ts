import { eq, sql } from "drizzle-orm";
import { db } from "../config/db";
import { appointments, doctorProfiles, reviews } from "../db/schema";
import { AppError } from "../utils/AppError";
import type { CreateReviewInput } from "../schemas/review.schema";

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
