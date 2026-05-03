import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { extractApiError } from "@/lib/helpers/errors";
import { getMySchedule, updateMySchedule, type ScheduleInput } from "../api";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface DayState {
  dayOfWeek: number;
  isActive: boolean;
  startTime: string;
  endTime: string;
}

const buildInitialState = (
  rows: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }[],
): DayState[] =>
  Array.from({ length: 7 }, (_, dow) => {
    const row = rows.find((r) => r.dayOfWeek === dow);
    return {
      dayOfWeek: dow,
      isActive: row?.isActive ?? false,
      startTime: row?.startTime.slice(0, 5) ?? "09:00",
      endTime: row?.endTime.slice(0, 5) ?? "17:00",
    };
  });

const scheduleQueryKey = ["me", "schedule"] as const;

export const ScheduleEditor = () => {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<number, string>
  >({});

  const { data: scheduleRows, isPending } = useQuery({
    queryKey: scheduleQueryKey,
    queryFn: getMySchedule,
    staleTime: 30_000,
  });

  const [days, setDays] = useState<DayState[] | null>(null);
  const activeDays = days ?? buildInitialState(scheduleRows ?? []);

  if (!isPending && days === null && scheduleRows !== undefined) {
    setDays(buildInitialState(scheduleRows));
  }

  const mutation = useMutation({
    mutationFn: (entries: ScheduleInput[]) => updateMySchedule(entries),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: scheduleQueryKey });
      toast.success("Schedule saved");
    },
  });

  const updateDay = (dow: number, patch: Partial<DayState>) => {
    setDays((prev) =>
      (prev ?? buildInitialState(scheduleRows ?? [])).map((d) =>
        d.dayOfWeek === dow ? { ...d, ...patch } : d,
      ),
    );
  };

  const validate = (): boolean => {
    const errors: Record<number, string> = {};
    for (const d of activeDays) {
      if (d.isActive && d.startTime >= d.endTime) {
        errors[d.dayOfWeek] = "Start must be before end";
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setServerError(null);
    const entries: ScheduleInput[] = activeDays
      .filter((d) => d.isActive)
      .map((d) => ({
        dayOfWeek: d.dayOfWeek,
        startTime: d.startTime,
        endTime: d.endTime,
        isActive: true,
      }));
    try {
      await mutation.mutateAsync(entries);
    } catch (err) {
      setServerError(extractApiError(err).error);
    }
  };

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Loading schedule…</p>;
  }

  return (
    <div className="grid gap-4">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      {activeDays.map((d) => (
        <div key={d.dayOfWeek} className="grid gap-1">
          <div className="flex items-center gap-3">
            <label className="flex w-16 shrink-0 cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                checked={d.isActive}
                onChange={(e) =>
                  updateDay(d.dayOfWeek, { isActive: e.target.checked })
                }
              />
              {DAY_NAMES[d.dayOfWeek]}
            </label>

            {d.isActive && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  title={`${DAY_NAMES[d.dayOfWeek]} start time`}
                  value={d.startTime}
                  onChange={(e) =>
                    updateDay(d.dayOfWeek, { startTime: e.target.value })
                  }
                  className="min-h-9 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-muted-foreground">–</span>
                <input
                  type="time"
                  title={`${DAY_NAMES[d.dayOfWeek]} end time`}
                  value={d.endTime}
                  onChange={(e) =>
                    updateDay(d.dayOfWeek, { endTime: e.target.value })
                  }
                  className="min-h-9 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
          </div>
          {validationErrors[d.dayOfWeek] && (
            <p className="ml-20 text-xs text-destructive">
              {validationErrors[d.dayOfWeek]}
            </p>
          )}
        </div>
      ))}

      <Button
        type="button"
        className="min-h-11 w-full"
        disabled={mutation.isPending}
        onClick={handleSave}
      >
        {mutation.isPending ? "Saving…" : "Save schedule"}
      </Button>
    </div>
  );
};
