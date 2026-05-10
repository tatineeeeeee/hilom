import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { useDoctorSlots } from "../hooks";
import { BookingModal } from "@/features/appointments/components/BookingModal";
import type { TimeSlot } from "../api";

interface SlotPickerProps {
  doctorId: string;
  doctorName: string;
}

const todayISO = (): string => new Date().toISOString().slice(0, 10);

const maxDateISO = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};

export const SlotPicker = ({ doctorId, doctorName }: SlotPickerProps) => {
  const [date, setDate] = useState(todayISO());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const {
    data: slots,
    isPending,
    isError,
    refetch,
  } = useDoctorSlots(doctorId, date);

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="slot-date">Select date</Label>
        <input
          id="slot-date"
          type="date"
          value={date}
          min={todayISO()}
          max={maxDateISO()}
          onChange={(e) => {
            setDate(e.target.value);
            setSelectedSlot(null);
          }}
          className="min-h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {isPending && (
        <p className="text-sm text-muted-foreground">Loading slots…</p>
      )}

      {isError && (
        <QueryErrorState
          message="Couldn't load slots for this date."
          onRetry={() => void refetch()}
        />
      )}

      {!isPending && !isError && slots !== undefined && (
        <>
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No available slots for this date.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <Button
                  key={slot.start}
                  variant={
                    selectedSlot?.start === slot.start ? "default" : "outline"
                  }
                  size="sm"
                  className="min-h-9"
                  onClick={() => setSelectedSlot(slot)}
                >
                  {slot.start}
                </Button>
              ))}
            </div>
          )}
        </>
      )}

      {selectedSlot && (
        <BookingModal
          doctorId={doctorId}
          doctorName={doctorName}
          date={date}
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </div>
  );
};
