import { and, count, desc, eq, inArray, lt, ne, or } from "drizzle-orm";
import { db } from "../config/db";
import { conversations, messages, users } from "../db/schema";
import { AppError } from "../utils/AppError";
import { emitToUser } from "../socket";
import {
  type MessagesQuery,
  type ListConversationsQuery,
  CONVERSATIONS_PAGE_SIZE,
} from "../schemas/chat.schema";

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

export interface ConversationsResult {
  conversations: ConversationListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export const listConversations = async (
  userId: string,
  query: ListConversationsQuery,
): Promise<ConversationsResult> => {
  const where = or(
    eq(conversations.patientId, userId),
    eq(conversations.doctorId, userId),
  );

  const [countRows, convs] = await Promise.all([
    db.select({ total: count() }).from(conversations).where(where),
    db
      .select()
      .from(conversations)
      .where(where)
      .orderBy(desc(conversations.createdAt))
      .limit(CONVERSATIONS_PAGE_SIZE)
      .offset((query.page - 1) * CONVERSATIONS_PAGE_SIZE),
  ]);

  if (convs.length === 0) {
    return {
      conversations: [],
      total: 0,
      page: query.page,
      pageSize: CONVERSATIONS_PAGE_SIZE,
    };
  }

  const convIds = convs.map((c) => c.id);
  const allPartyIds = [
    ...new Set(convs.flatMap((c) => [c.patientId, c.doctorId])),
  ];

  // 3 parallel queries instead of 3 per conversation
  const [userRows, lastMsgRows, unreadRows] = await Promise.all([
    db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(inArray(users.id, allPartyIds)),
    db
      .selectDistinctOn([messages.conversationId], {
        conversationId: messages.conversationId,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(inArray(messages.conversationId, convIds))
      .orderBy(messages.conversationId, desc(messages.createdAt)),
    db
      .select({ conversationId: messages.conversationId, total: count() })
      .from(messages)
      .where(
        and(
          inArray(messages.conversationId, convIds),
          eq(messages.isRead, false),
          ne(messages.senderId, userId),
        ),
      )
      .groupBy(messages.conversationId),
  ]);

  const userMap = new Map(userRows.map((u) => [u.id, u.fullName]));
  const lastMsgMap = new Map(lastMsgRows.map((m) => [m.conversationId, m]));
  const unreadMap = new Map(unreadRows.map((r) => [r.conversationId, r.total]));

  const items: ConversationListItem[] = convs.map((c) => {
    const otherId = c.patientId === userId ? c.doctorId : c.patientId;
    const lastMsg = lastMsgMap.get(c.id);
    return {
      id: c.id,
      appointmentId: c.appointmentId,
      otherPartyId: otherId,
      otherPartyName: userMap.get(otherId) ?? "Unknown",
      lastMessageContent: lastMsg?.content ?? null,
      lastMessageAt: lastMsg?.createdAt ?? null,
      unreadCount: unreadMap.get(c.id) ?? 0,
    };
  });

  items.sort((a, b) => {
    const at = a.lastMessageAt?.getTime() ?? 0;
    const bt = b.lastMessageAt?.getTime() ?? 0;
    return bt - at;
  });

  return {
    conversations: items,
    total: countRows[0]?.total ?? 0,
    page: query.page,
    pageSize: CONVERSATIONS_PAGE_SIZE,
  };
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
