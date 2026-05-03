import { z } from "zod";

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1, "Message cannot be empty").max(2000),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const messagesQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type MessagesQuery = z.infer<typeof messagesQuerySchema>;
