import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/adminGuard";
import {
  listUsers,
  listUnverifiedDoctors,
  verifyDoctor,
  getPlatformStats,
} from "../controllers/admin.controller";

export const adminRouter: ExpressRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/users", asyncHandler(listUsers));
adminRouter.get("/doctors/unverified", asyncHandler(listUnverifiedDoctors));
adminRouter.patch("/doctors/:id/verify", asyncHandler(verifyDoctor));
adminRouter.get("/stats", asyncHandler(getPlatformStats));
