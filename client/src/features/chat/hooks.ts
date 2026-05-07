import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import { getSocket } from "@/lib/socket";
import {
  getConversation,
  getMessages,
  getUnreadCount,
  listConversations,
  markConversationRead,
  sendMessage,
} from "./api";
import type { Message, MessagesPage } from "./schemas";

export const conversationKey = (appointmentId: string) =>
  ["conversation", appointmentId] as const;

export const messagesKey = (conversationId: string) =>
  ["messages", conversationId] as const;

export const conversationListKey = ["conversations"] as const;
export const unreadKey = ["unreadCount"] as const;

export const useConversation = (appointmentId: string) =>
  useQuery({
    queryKey: conversationKey(appointmentId),
    queryFn: () => getConversation(appointmentId),
    staleTime: 60_000,
    retry: false,
  });

export const useMessages = (conversationId: string | undefined) =>
  useQuery({
    queryKey: conversationId ? messagesKey(conversationId) : ["messages", ""],
    queryFn: () => {
      if (!conversationId) throw new Error("No conversation");
      return getMessages(conversationId, { limit: 50 });
    },
    enabled: Boolean(conversationId),
    staleTime: 0,
  });

export const useSendMessage = (conversationId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => {
      if (!conversationId) throw new Error("No conversation");
      return sendMessage(conversationId, content);
    },
    onSuccess: (msg) => {
      if (!conversationId) return;
      qc.setQueryData<MessagesPage>(messagesKey(conversationId), (prev) => {
        if (!prev) return { messages: [msg], hasMore: false };
        if (prev.messages.some((m) => m.id === msg.id)) return prev;
        return { ...prev, messages: [...prev.messages, msg] };
      });
    },
  });
};

export const useConversationList = () => {
  const isAuthenticated = useAuthStore((s) => s.user !== null);
  return useQuery({
    queryKey: conversationListKey,
    queryFn: listConversations,
    staleTime: 15_000,
    enabled: isAuthenticated,
  });
};

export const useUnreadCount = () => {
  const isAuthenticated = useAuthStore((s) => s.user !== null);
  return useQuery({
    queryKey: unreadKey,
    queryFn: getUnreadCount,
    staleTime: 30_000,
    refetchInterval: 30_000,
    enabled: isAuthenticated,
  });
};

export const useMarkRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markConversationRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: unreadKey });
      void qc.invalidateQueries({ queryKey: conversationListKey });
    },
  });
};

interface IncomingMessagePayload {
  message: Message;
  conversationId: string;
}

const isIncomingMessage = (value: unknown): value is IncomingMessagePayload => {
  if (typeof value !== "object" || value === null) return false;
  if (!("message" in value) || !("conversationId" in value)) return false;
  const v = value as { message: unknown; conversationId: unknown };
  if (typeof v.conversationId !== "string") return false;
  if (typeof v.message !== "object" || v.message === null) return false;
  const m = v.message as { id?: unknown; content?: unknown };
  return typeof m.id === "string" && typeof m.content === "string";
};

export const useChatSocket = (): void => {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    const handleMessage = (payload: unknown) => {
      if (!isIncomingMessage(payload)) return;
      qc.setQueryData<MessagesPage>(
        messagesKey(payload.conversationId),
        (prev) => {
          if (!prev) return { messages: [payload.message], hasMore: false };
          if (prev.messages.some((m) => m.id === payload.message.id))
            return prev;
          return { ...prev, messages: [...prev.messages, payload.message] };
        },
      );
      void qc.invalidateQueries({ queryKey: unreadKey });
      void qc.invalidateQueries({ queryKey: conversationListKey });
    };

    const handleRead = () => {
      void qc.invalidateQueries({ queryKey: unreadKey });
      void qc.invalidateQueries({ queryKey: conversationListKey });
    };

    socket.on("message:new", handleMessage);
    socket.on("messages:read", handleRead);

    return () => {
      socket.off("message:new", handleMessage);
      socket.off("messages:read", handleRead);
    };
  }, [token, qc]);
};
