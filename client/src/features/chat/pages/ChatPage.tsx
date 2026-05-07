import { useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/store";
import {
  useConversation,
  useMessages,
  useSendMessage,
  useMarkRead,
  useChatSocket,
} from "../hooks";
import { MessageBubble } from "../components/MessageBubble";
import { ComposeBar } from "../components/ComposeBar";

export const ChatPage = () => {
  const { id: appointmentId = "" } = useParams<{ id: string }>();
  const userId = useAuthStore((s) => s.user?.id);

  useChatSocket();

  const conv = useConversation(appointmentId);
  const conversationId = conv.data?.id;
  const messages = useMessages(conversationId);
  const send = useSendMessage(conversationId);
  const markRead = useMarkRead();

  const scrollRef = useRef<HTMLDivElement>(null);
  const list = messages.data?.messages ?? [];
  const lastMessageId = list[list.length - 1]?.id;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lastMessageId]);

  useEffect(() => {
    if (!conversationId) return;
    markRead.mutate(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  if (conv.isPending) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading chat…</div>
    );
  }

  if (conv.isError) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Chat is available once the appointment is confirmed.
        </p>
        <Link
          to="/appointments"
          className="mt-3 inline-block text-sm text-primary underline"
        >
          Back to appointments
        </Link>
      </div>
    );
  }

  const handleSend = async (content: string) => {
    try {
      await send.mutateAsync(content);
    } catch {
      toast.error("Failed to send");
    }
  };

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <Link
          to="/messages"
          className="flex size-9 items-center justify-center rounded-md hover:bg-muted"
          aria-label="Back to conversations"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Conversation</p>
          <p className="truncate text-xs text-muted-foreground">
            Appointment chat
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4">
        {messages.isPending && (
          <p className="text-center text-xs text-muted-foreground">Loading…</p>
        )}
        {!messages.isPending && list.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">
            No messages yet. Say hello!
          </p>
        )}
        <div className="flex flex-col gap-3">
          {list.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isOwn={m.senderId === userId}
            />
          ))}
        </div>
      </div>

      <ComposeBar onSend={handleSend} disabled={!conversationId} />
    </div>
  );
};
