import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface Props {
  disabled?: boolean;
  onSend: (content: string) => Promise<void> | void;
}

export const ComposeBar = ({ disabled, onSend }: Props) => {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setValue("");
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 flex items-end gap-2 border-t bg-background px-3 py-3"
    >
      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type a message…"
        disabled={disabled || sending}
        autoComplete="off"
        className="flex-1"
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || sending || value.trim().length === 0}
        aria-label="Send message"
      >
        <Send className="size-4" />
      </Button>
    </form>
  );
};
