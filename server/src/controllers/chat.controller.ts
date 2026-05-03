import type { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { messagesQuerySchema, sendMessageSchema } from "../schemas/chat.schema";
import {
  getConversationByAppointment,
  listMessages,
  sendMessage,
  listConversations,
  markConversationRead,
  getUnreadCount,
} from "../services/chat.service";

export const getConversationForAppointment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");
  const conv = await getConversationByAppointment(
    req.params.id ?? "",
    req.user.id,
  );
  res.json({ success: true, data: { conversation: conv } });
};

export const getMessages = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");
  const parsed = messagesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Invalid query", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }
  const page = await listMessages(
    req.params.id ?? "",
    req.user.id,
    parsed.data,
  );
  res.json({ success: true, data: page });
};

export const postMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid message", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }
  const message = await sendMessage(
    req.params.id ?? "",
    req.user.id,
    parsed.data.content,
  );
  res.status(201).json({ success: true, data: { message } });
};

export const listMyConversations = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");
  const items = await listConversations(req.user.id);
  res.json({ success: true, data: { conversations: items } });
};

export const markRead = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");
  await markConversationRead(req.params.id ?? "", req.user.id);
  res.json({ success: true, data: null });
};

export const getUnreadTotal = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");
  const value = await getUnreadCount(req.user.id);
  res.json({ success: true, data: { count: value } });
};
