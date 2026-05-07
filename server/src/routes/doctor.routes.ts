import { Router, type IRouter } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { listDoctors, getDoctor } from "../controllers/doctor.controller";
import { getDoctorSlots } from "../controllers/slot.controller";
import { listDoctorReviews } from "../controllers/review.controller";

export const doctorRouter: IRouter = Router();

doctorRouter.get("/", asyncHandler(listDoctors));
doctorRouter.get("/:id/slots", asyncHandler(getDoctorSlots));
doctorRouter.get("/:id/reviews", asyncHandler(listDoctorReviews));
doctorRouter.get("/:id", asyncHandler(getDoctor));
