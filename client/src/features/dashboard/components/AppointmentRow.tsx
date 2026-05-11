import { Link } from "react-router-dom";
import type { DoctorStatsScheduleRow } from "../schemas";

const statusColors: Record<DoctorStatsScheduleRow["status"], string> = {
  pending: "bg-[oklch(0.78_0.13_85_/_0.15)] text-[oklch(0.40_0.10_85)]",
  confirmed: "bg-primary/12 text-primary",
  completed: "bg-[oklch(0.70_0.13_130_/_0.15)] text-[oklch(0.30_0.10_130)]",
  cancelled: "bg-muted text-muted-foreground",
};

const dotColors: Record<DoctorStatsScheduleRow["status"], string> = {
  pending: "bg-[oklch(0.78_0.13_85)]",
  confirmed: "bg-primary",
  completed: "bg-[oklch(0.70_0.13_130)]",
  cancelled: "bg-muted-foreground",
};

interface AppointmentRowProps {
  row: DoctorStatsScheduleRow;
  variant?: "default" | "timeline";
}

export const AppointmentRow = ({
  row,
  variant = "default",
}: AppointmentRowProps) => {
  if (variant === "timeline") {
    return (
      <Link
        to="/my-appointments"
        className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted"
      >
        <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
          {row.slotStart}
        </span>
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColors[row.status]}`}
        />
        <span className="min-w-0 flex-1 text-sm font-medium truncate">
          {row.patientName}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[row.status]}`}
        >
          {row.status}
        </span>
      </Link>
    );
  }

  return (
    <Link
      to="/my-appointments"
      className="flex min-h-13 items-center justify-between gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-muted"
    >
      <div className="grid gap-0.5">
        <p className="text-sm font-medium">{row.patientName}</p>
        <p className="text-xs text-muted-foreground">
          {row.slotStart}–{row.slotEnd}
        </p>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[row.status]}`}
      >
        {row.status}
      </span>
    </Link>
  );
};
