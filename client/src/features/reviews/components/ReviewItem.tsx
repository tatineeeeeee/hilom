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

interface ReviewItemProps {
  review: Review;
}

export const ReviewItem = ({ review }: ReviewItemProps) => (
  <div className="rounded-lg border p-4">
    <div className="mb-1 flex items-center justify-between gap-2">
      <p className="text-sm font-medium">{initialName(review.patientName)}</p>
      <span className="text-xs text-muted-foreground">
        {formatDay(review.createdAt)}
      </span>
    </div>
    <StarBar value={review.rating} />
    {review.comment && (
      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
        {review.comment}
      </p>
    )}
  </div>
);
