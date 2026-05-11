import { cn } from "@/lib/utils";

interface Props {
  count: number;
  className?: string;
}

export const UnreadBadge = ({ count, className }: Props) => {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold leading-5 text-white",
        className,
      )}
      aria-label={`${count} unread`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
};
