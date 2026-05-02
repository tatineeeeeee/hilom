import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { listSpecializations } from "../controllers/specialization.controller";

export const specializationRouter: ExpressRouter = Router();

specializationRouter.get("/", asyncHandler(listSpecializations));
