import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/lib/api/types";
import type {
  Conversation,
  ConversationListItem,
  Message,
  MessagesPage,
} from "./schemas";

export const getConversation = async (
  appointmentId: string,
): Promise<Conversation> => {
  const { data } = await apiClient().get<
    ApiSuccess<{ conversation: Conversation }>
  >(`/appointments/${encodeURIComponent(appointmentId)}/conversation`);
  return data.data.conversation;
};

export const getMessages = async (
  conversationId: string,
  params: { cursor?: string; limit?: number } = {},
): Promise<MessagesPage> => {
  const search = new URLSearchParams();
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  const { data } = await apiClient().get<ApiSuccess<MessagesPage>>(
    `/conversations/${encodeURIComponent(conversationId)}/messages${qs ? `?${qs}` : ""}`,
  );
  return data.data;
};

export const sendMessage = async (
  conversationId: string,
  content: string,
): Promise<Message> => {
  const { data } = await apiClient().post<ApiSuccess<{ message: Message }>>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    { content },
  );
  return data.data.message;
};

export const listConversations = async (): Promise<ConversationListItem[]> => {
  const { data } =
    await apiClient().get<
      ApiSuccess<{ conversations: ConversationListItem[] }>
    >("/conversations");
  return data.data.conversations;
};

export const markConversationRead = async (
  conversationId: string,
): Promise<void> => {
  await apiClient().post(
    `/conversations/${encodeURIComponent(conversationId)}/read`,
  );
};

export const getUnreadCount = async (): Promise<number> => {
  const { data } =
    await apiClient().get<ApiSuccess<{ count: number }>>("/me/unread-count");
  return data.data.count;
};
