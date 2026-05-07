import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth.middleware";
import { listMyPayments } from "../controllers/payment.controller";

export const paymentRouter: ExpressRouter = Router();

paymentRouter.get("/", requireAuth, asyncHandler(listMyPayments));
