import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useDoctorSlots } from "../hooks";

interface SlotPickerProps {
  doctorId: string;
}

const todayISO = (): string => new Date().toISOString().slice(0, 10);

const maxDateISO = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};

export const SlotPicker = ({ doctorId }: SlotPickerProps) => {
  const [date, setDate] = useState(todayISO());

  const { data: slots, isPending, isError } = useDoctorSlots(doctorId, date);

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
          onChange={(e) => setDate(e.target.value)}
          className="min-h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {isPending && (
        <p className="text-sm text-muted-foreground">Loading slots…</p>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          Could not load slots for this date.
        </p>
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
                  variant="outline"
                  size="sm"
                  className="min-h-9"
                  onClick={() =>
                    toast.info(
                      `Booking opens in Phase 4 (${slot.start}–${slot.end})`,
                    )
                  }
                >
                  {slot.start}
                </Button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
