import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth.middleware";
import {
  getMessages,
  postMessage,
  listMyConversations,
  markRead,
} from "../controllers/chat.controller";

export const chatRouter: ExpressRouter = Router();

chatRouter.use(requireAuth);

chatRouter.get("/", asyncHandler(listMyConversations));
chatRouter.get("/:id/messages", asyncHandler(getMessages));
chatRouter.post("/:id/messages", asyncHandler(postMessage));
chatRouter.post("/:id/read", asyncHandler(markRead));
