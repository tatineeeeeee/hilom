import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyAppointments } from "@/features/appointments/hooks";
import { initials } from "@/lib/utils/initials";
import type { Appointment } from "@/features/appointments/schemas";

const dedupeByDoctor = (appointments: Appointment[]): Appointment[] => {
  const seen = new Set<string>();
  return appointments
    .slice()
    .sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate))
    .filter((a) => {
      if (seen.has(a.doctorId)) return false;
      seen.add(a.doctorId);
      return true;
    })
    .slice(0, 4);
};

export const RecentDoctorsRow = () => {
  const { data, isPending } = useMyAppointments({ page: 1 });

  if (isPending) {
    return (
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-[72px] shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  const past = (data?.appointments ?? []).filter(
    (a) => a.status === "completed",
  );
  if (past.length === 0) return null;

  const recent = dedupeByDoctor(past);

  return (
    <div>
      <p className="mb-3 text-sm font-medium">Recent doctors</p>
      <div className="flex gap-4 overflow-x-auto snap-x pb-2 -mx-1 px-1">
        {recent.map((a) => (
          <Link
            key={a.doctorId}
            to={`/doctors/${a.doctorId}`}
            className="flex flex-col items-center gap-1.5 min-w-[72px] snap-start rounded-lg p-1 transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials(a.doctorName)}
            </div>
            <p className="w-16 truncate text-center text-xs font-medium leading-tight">
              {a.doctorName}
            </p>
            <p className="w-16 truncate text-center text-xs text-muted-foreground">
              {a.specializationName}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};
