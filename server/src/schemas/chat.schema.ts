import { z } from "zod";

export const listConversationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
});
export type ListConversationsQuery = z.infer<
  typeof listConversationsQuerySchema
>;
export const CONVERSATIONS_PAGE_SIZE = 20;

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1, "Message cannot be empty").max(2000),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const messagesQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type MessagesQuery = z.infer<typeof messagesQuerySchema>;
