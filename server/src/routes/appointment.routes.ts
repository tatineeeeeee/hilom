import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth.middleware";
import {
  bookAppointment,
  listMyAppointments,
  updateStatus,
} from "../controllers/appointment.controller";
import { createReview } from "../controllers/review.controller";
import { getConversationForAppointment } from "../controllers/chat.controller";
import {
  writePrescription,
  getPrescription,
} from "../controllers/prescription.controller";

export const appointmentRouter: ExpressRouter = Router();

appointmentRouter.post("/", requireAuth, asyncHandler(bookAppointment));
appointmentRouter.get("/", requireAuth, asyncHandler(listMyAppointments));
appointmentRouter.patch("/:id/status", requireAuth, asyncHandler(updateStatus));
appointmentRouter.post("/:id/review", requireAuth, asyncHandler(createReview));
appointmentRouter.get(
  "/:id/conversation",
  requireAuth,
  asyncHandler(getConversationForAppointment),
);
appointmentRouter.post(
  "/:id/prescription",
  requireAuth,
  asyncHandler(writePrescription),
);
appointmentRouter.get(
  "/:id/prescription",
  requireAuth,
  asyncHandler(getPrescription),
);
