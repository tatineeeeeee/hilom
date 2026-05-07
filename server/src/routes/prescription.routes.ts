import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth.middleware";
import { listMyPrescriptions } from "../controllers/prescription.controller";

export const prescriptionRouter: ExpressRouter = Router();

prescriptionRouter.get("/", requireAuth, asyncHandler(listMyPrescriptions));
