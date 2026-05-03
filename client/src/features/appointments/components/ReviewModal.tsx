import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitReview } from "../hooks";
import type { Appointment } from "../schemas";

interface ReviewModalProps {
  appointment: Appointment;
  onClose: () => void;
  onSuccess: () => void;
}

const StarButton = ({
  filled,
  onClick,
  onMouseEnter,
}: {
  filled: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) => (
  <button
    type="button"
    className={`text-2xl transition-colors ${filled ? "text-amber-400" : "text-muted-foreground/30"}`}
    onClick={onClick}
    onMouseEnter={onMouseEnter}
  >
    ★
  </button>
);

export const ReviewModal = ({
  appointment,
  onClose,
  onSuccess,
}: ReviewModalProps) => {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const { mutate, isPending } = useSubmitReview();

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    mutate(
      {
        appointmentId: appointment.id,
        input: { rating, comment: comment.trim() || undefined },
      },
      {
        onSuccess: () => {
          toast.success("Review submitted!");
          onSuccess();
        },
        onError: () => toast.error("Failed to submit review"),
      },
    );
  };

  const displayRating = hovered || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-lg">
        <h2 className="mb-1 text-lg font-semibold">Leave a review</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          How was your appointment with {appointment.doctorName}?
        </p>

        <div className="mb-4">
          <Label className="mb-1.5 block">Rating</Label>
          <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
            {[1, 2, 3, 4, 5].map((star) => (
              <StarButton
                key={star}
                filled={star <= displayRating}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
              />
            ))}
          </div>
        </div>

        <div className="mb-4 grid gap-1.5">
          <Label htmlFor="review-comment">Comment (optional)</Label>
          <Textarea
            id="review-comment"
            placeholder="Share your experience..."
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">
            {comment.length}/1000
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={isPending || rating === 0}
          >
            {isPending ? "Submitting…" : "Submit review"}
          </Button>
        </div>
      </div>
    </div>
  );
};
