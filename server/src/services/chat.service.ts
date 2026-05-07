import { and, count, desc, eq, lt, ne, or } from "drizzle-orm";
import { db } from "../config/db";
import { conversations, messages, users } from "../db/schema";
import { AppError } from "../utils/AppError";
import { emitToUser } from "../socket";
import type { MessagesQuery } from "../schemas/chat.schema";

export interface ConversationRow {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  createdAt: Date;
}

export interface MessageRow {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

export const findOrCreateConversation = async (
  appointmentId: string,
  patientId: string,
  doctorUserId: string,
): Promise<ConversationRow> => {
  const existing = await db.query.conversations.findFirst({
    where: eq(conversations.appointmentId, appointmentId),
  });
  if (existing) return existing;

  const [inserted] = await db
    .insert(conversations)
    .values({ appointmentId, patientId, doctorId: doctorUserId })
    .onConflictDoNothing({ target: conversations.appointmentId })
    .returning();
  if (inserted) return inserted;

  const after = await db.query.conversations.findFirst({
    where: eq(conversations.appointmentId, appointmentId),
  });
  if (!after) throw new AppError(500, "Failed to create conversation");
  return after;
};

const assertParticipant = (conv: ConversationRow, userId: string): void => {
  if (conv.patientId !== userId && conv.doctorId !== userId) {
    throw new AppError(403, "Not a participant in this conversation");
  }
};

export const getConversationByAppointment = async (
  appointmentId: string,
  userId: string,
): Promise<ConversationRow> => {
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.appointmentId, appointmentId),
  });
  if (!conv) throw new AppError(404, "Conversation not found");
  assertParticipant(conv, userId);
  return conv;
};

const loadConversation = async (
  conversationId: string,
  userId: string,
): Promise<ConversationRow> => {
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });
  if (!conv) throw new AppError(404, "Conversation not found");
  assertParticipant(conv, userId);
  return conv;
};

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  content: string,
): Promise<MessageRow> => {
  const conv = await loadConversation(conversationId, senderId);

  const [inserted] = await db
    .insert(messages)
    .values({ conversationId, senderId, content })
    .returning();
  if (!inserted) throw new AppError(500, "Failed to send message");

  const recipientId =
    senderId === conv.patientId ? conv.doctorId : conv.patientId;
  emitToUser(recipientId, "message:new", {
    message: inserted,
    conversationId,
  });

  return inserted;
};

export interface MessagesPage {
  messages: MessageRow[];
  hasMore: boolean;
}

export const listMessages = async (
  conversationId: string,
  userId: string,
  query: MessagesQuery,
): Promise<MessagesPage> => {
  await loadConversation(conversationId, userId);

  const conditions = [eq(messages.conversationId, conversationId)];
  if (query.cursor) {
    conditions.push(lt(messages.createdAt, new Date(query.cursor)));
  }

  const rows = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(query.limit + 1);

  const hasMore = rows.length > query.limit;
  const trimmed = hasMore ? rows.slice(0, query.limit) : rows;

  return {
    messages: trimmed.slice().reverse(),
    hasMore,
  };
};

export interface ConversationListItem {
  id: string;
  appointmentId: string;
  otherPartyId: string;
  otherPartyName: string;
  lastMessageContent: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
}

export const listConversations = async (
  userId: string,
): Promise<ConversationListItem[]> => {
  const convs = await db
    .select()
    .from(conversations)
    .where(
      or(
        eq(conversations.patientId, userId),
        eq(conversations.doctorId, userId),
      ),
    );

  const items = await Promise.all(
    convs.map(async (c) => {
      const otherId = c.patientId === userId ? c.doctorId : c.patientId;

      const [otherUser, lastMsg, unread] = await Promise.all([
        db
          .select({ id: users.id, fullName: users.fullName })
          .from(users)
          .where(eq(users.id, otherId))
          .limit(1),
        db
          .select({
            content: messages.content,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .where(eq(messages.conversationId, c.id))
          .orderBy(desc(messages.createdAt))
          .limit(1),
        db
          .select({ value: count() })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, c.id),
              eq(messages.isRead, false),
              ne(messages.senderId, userId),
            ),
          ),
      ]);

      return {
        id: c.id,
        appointmentId: c.appointmentId,
        otherPartyId: otherId,
        otherPartyName: otherUser[0]?.fullName ?? "Unknown",
        lastMessageContent: lastMsg[0]?.content ?? null,
        lastMessageAt: lastMsg[0]?.createdAt ?? null,
        unreadCount: unread[0]?.value ?? 0,
      };
    }),
  );

  items.sort((a, b) => {
    const at = a.lastMessageAt?.getTime() ?? 0;
    const bt = b.lastMessageAt?.getTime() ?? 0;
    return bt - at;
  });

  return items;
};

export const markConversationRead = async (
  conversationId: string,
  userId: string,
): Promise<void> => {
  const conv = await loadConversation(conversationId, userId);

  await db
    .update(messages)
    .set({ isRead: true })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.isRead, false),
        ne(messages.senderId, userId),
      ),
    );

  emitToUser(userId, "messages:read", { conversationId });
  const otherId = conv.patientId === userId ? conv.doctorId : conv.patientId;
  emitToUser(otherId, "messages:read", { conversationId });
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  const rows = await db
    .select({ value: count() })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(messages.isRead, false),
        ne(messages.senderId, userId),
        or(
          eq(conversations.patientId, userId),
          eq(conversations.doctorId, userId),
        ),
      ),
    );
  return rows[0]?.value ?? 0;
};
