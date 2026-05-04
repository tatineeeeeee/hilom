import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBookAppointment } from "../hooks";
import { isAxiosError } from "axios";

interface BookingModalProps {
  doctorId: string;
  doctorName: string;
  date: string;
  slot: { start: string; end: string };
  onClose: () => void;
}

export const BookingModal = ({
  doctorId,
  doctorName,
  date,
  slot,
  onClose,
}: BookingModalProps) => {
  const [reason, setReason] = useState("");
  const [conflictError, setConflictError] = useState(false);
  const navigate = useNavigate();
  const { mutate, isPending } = useBookAppointment();

  const handleBook = () => {
    setConflictError(false);
    mutate(
      {
        doctorId,
        appointmentDate: date,
        slotStart: slot.start,
        slotEnd: slot.end,
        reason: reason.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          toast.success("Appointment booked!");
          navigate(`/payments/${result.appointment.id}`);
        },
        onError: (err) => {
          if (isAxiosError(err) && err.response?.status === 409) {
            setConflictError(true);
          } else {
            toast.error("Failed to book appointment");
          }
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Confirm booking</h2>

        <div className="mb-4 rounded-lg bg-muted p-3 text-sm">
          <p className="font-medium">{doctorName}</p>
          <p className="text-muted-foreground">
            {date} &middot; {slot.start}–{slot.end}
          </p>
        </div>

        <div className="mb-4 grid gap-1.5">
          <Label htmlFor="reason">Reason (optional)</Label>
          <Textarea
            id="reason"
            placeholder="Briefly describe why you're booking..."
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">
            {reason.length}/500
          </p>
        </div>

        {conflictError && (
          <p className="mb-3 text-sm text-destructive">
            This slot was just taken — please pick another.
          </p>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleBook} disabled={isPending}>
            {isPending ? "Booking…" : "Book appointment"}
          </Button>
        </div>
      </div>
    </div>
  );
};
