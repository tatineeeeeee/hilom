import { Link } from "react-router-dom";
import type { DoctorStatsScheduleRow } from "../schemas";

const statusColors: Record<DoctorStatsScheduleRow["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-muted text-muted-foreground",
};

interface AppointmentRowProps {
  row: DoctorStatsScheduleRow;
}

export const AppointmentRow = ({ row }: AppointmentRowProps) => (
  <Link
    to="/my-appointments"
    className="flex min-h-[52px] items-center justify-between gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-muted"
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
