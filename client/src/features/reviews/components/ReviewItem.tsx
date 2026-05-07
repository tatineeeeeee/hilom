import { StarBar } from "./StarBar";
import type { Review } from "../schemas";

const formatDay = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const initialName = (full: string): string => {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0) return "Anonymous";
  if (parts.length === 1) return parts[0] ?? "Anonymous";
  const first = parts[0];
  const lastInitial = parts[parts.length - 1]?.charAt(0) ?? "";
  return lastInitial
    ? `${first ?? "Anonymous"} ${lastInitial}.`
    : (first ?? "Anonymous");
};

const avatarInitials = (full: string): string =>
  full
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

interface ReviewItemProps {
  review: Review;
}

export const ReviewItem = ({ review }: ReviewItemProps) => (
  <div className="rounded-lg border p-4">
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {avatarInitials(review.patientName)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">
            {initialName(review.patientName)}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDay(review.createdAt)}
          </span>
        </div>
        <div className="mt-0.5">
          <StarBar value={review.rating} />
        </div>
        {review.comment && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {review.comment}
          </p>
        )}
      </div>
    </div>
  </div>
);
