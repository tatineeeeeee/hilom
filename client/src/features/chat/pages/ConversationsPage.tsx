import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useChatSocket, useConversationList } from "../hooks";
import { UnreadBadge } from "../components/UnreadBadge";

const formatRelative = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

export const ConversationsPage = () => {
  useChatSocket();
  const { data, isPending, isError } = useConversationList();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl">
        Messages
      </h1>

      {isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
      {isError && (
        <p className="text-sm text-destructive">
          Could not load conversations.
        </p>
      )}

      {data && data.length === 0 && (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">No conversations yet.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-2">
          {data.map((c) => (
            <Card key={c.id}>
              <Link to={`/appointments/${c.appointmentId}/chat`}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex size-10 flex-none items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {c.otherPartyName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {c.otherPartyName}
                      </p>
                      <span className="flex-none text-xs text-muted-foreground">
                        {formatRelative(c.lastMessageAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted-foreground">
                        {c.lastMessageContent ?? "No messages yet"}
                      </p>
                      <UnreadBadge count={c.unreadCount} />
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
