import { cn } from "@/lib/utils";
import type { Message } from "../schemas";

interface Props {
  message: Message;
  isOwn: boolean;
}

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const MessageBubble = ({ message, isOwn }: Props) => {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-1",
        isOwn ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm",
        )}
      >
        {message.content}
      </div>
      <span className="text-xs text-muted-foreground">
        {formatTime(message.createdAt)}
      </span>
    </div>
  );
};
