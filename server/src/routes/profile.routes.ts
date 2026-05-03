import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth.middleware";
import {
  getMyProfile,
  updateMyProfile,
  getMySchedule,
  updateMySchedule,
} from "../controllers/profile.controller";
import { listMyDoctorAppointments } from "../controllers/appointment.controller";

export const profileRouter: ExpressRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get("/profile", asyncHandler(getMyProfile));
profileRouter.put("/profile", asyncHandler(updateMyProfile));
profileRouter.get("/schedule", asyncHandler(getMySchedule));
profileRouter.put("/schedule", asyncHandler(updateMySchedule));
profileRouter.get(
  "/doctor-appointments",
  asyncHandler(listMyDoctorAppointments),
);
