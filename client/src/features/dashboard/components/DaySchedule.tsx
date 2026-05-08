import { Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppointmentRow } from "./AppointmentRow";
import type { DoctorStatsScheduleRow } from "../schemas";

const HOURS = Array.from({ length: 10 }, (_, i) => i + 8);

const hourOf = (slotStart: string): number =>
  parseInt(slotStart.split(":")[0] ?? "0", 10);

interface Props {
  schedule: DoctorStatsScheduleRow[];
}

export const DaySchedule = ({ schedule }: Props) => {
  const today = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  if (schedule.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Today's schedule</CardTitle>
            <span className="text-xs text-muted-foreground">{today}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Clock className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nothing scheduled today.
            </p>
            <Link
              to="/my-appointments"
              className="text-sm font-medium text-primary hover:underline"
            >
              Manage schedule →
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Today's schedule</CardTitle>
          <span className="text-xs text-muted-foreground">{today}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {HOURS.map((h) => {
            const appts = schedule.filter((r) => hourOf(r.slotStart) === h);
            return (
              <div key={h} className="flex min-h-12 gap-3">
                <span className="w-7 shrink-0 pt-2 tabular-nums text-xs text-muted-foreground">
                  {String(h).padStart(2, "0")}
                </span>
                <div className="flex-1 border-l border-dashed border-border pl-3 py-1">
                  {appts.length > 0 ? (
                    <ul className="space-y-0.5">
                      {appts.map((row) => (
                        <li key={row.id}>
                          <AppointmentRow row={row} variant="timeline" />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="pt-1.5 block text-xs text-muted-foreground/40">
                      Free
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
