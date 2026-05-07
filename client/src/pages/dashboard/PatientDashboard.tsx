import { Link } from "react-router-dom";
import { CalendarDays, Pill } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/features/dashboard/components/StatTile";
import { useMyAppointments } from "@/features/appointments/hooks";
import { useMyPrescriptions } from "@/features/prescriptions/hooks";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-muted text-muted-foreground",
};

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

const daysUntil = (isoDate: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoDate);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1) return `In ${diff} days`;
  return "Past";
};

const SPECIALTIES = [
  "Cardiology",
  "Dermatology",
  "General Practice",
  "Pediatrics",
  "OB-Gyne",
];

const UpcomingCard = () => {
  const { data, isPending } = useMyAppointments({ page: 1 });
  const next = data?.appointments.find(
    (a) => a.status === "pending" || a.status === "confirmed",
  );

  if (isPending) {
    return <Skeleton className="h-36 rounded-xl" />;
  }

  if (!next) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <CalendarDays className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="font-medium">No upcoming appointments</p>
          <p className="text-sm text-muted-foreground">
            Find a doctor and book your first visit.
          </p>
        </div>
        <Link to="/doctors" className={buttonVariants({ size: "sm" })}>
          Book a doctor
        </Link>
      </Card>
    );
  }

  const countdown = daysUntil(next.appointmentDate);

  return (
    <Link
      to="/appointments"
      className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Upcoming appointment</CardTitle>
            <Badge
              variant="secondary"
              className="text-xs font-medium text-primary"
            >
              {countdown}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials(next.doctorName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-tight">{next.doctorName}</p>
              <p className="text-sm text-muted-foreground">
                {next.specializationName}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {next.appointmentDate} · {next.slotStart}–{next.slotEnd}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[next.status] ?? "bg-muted text-muted-foreground"}`}
            >
              {next.status}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

const PatientStatTiles = () => {
  const { data: apptData, isPending: apptPending } = useMyAppointments({
    page: 1,
  });
  const { data: rxData, isPending: rxPending } = useMyPrescriptions();

  const currentMonth = new Date().toISOString().slice(0, 7);
  const appointmentsThisMonth =
    apptData?.appointments.filter((a) =>
      a.appointmentDate.startsWith(currentMonth),
    ).length ?? 0;
  const prescriptionCount = rxData?.length ?? 0;

  if (apptPending || rxPending) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <StatTile
        icon={<CalendarDays />}
        accent="teal"
        label="This month"
        value={appointmentsThisMonth}
        sublabel="appointments"
      />
      <StatTile
        icon={<Pill />}
        accent="blue"
        label="Prescriptions"
        value={prescriptionCount}
        sublabel="total"
        to="/appointments"
      />
    </div>
  );
};

const QuickBookCard = () => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base">Find a doctor</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex flex-wrap gap-2">
        {SPECIALTIES.map((name) => (
          <Link key={name} to="/doctors">
            <Badge
              variant="secondary"
              className="cursor-pointer transition-colors hover:bg-accent"
            >
              {name}
            </Badge>
          </Link>
        ))}
        <Link
          to="/doctors"
          className="text-sm font-medium text-primary hover:underline self-center ml-1"
        >
          Browse all →
        </Link>
      </div>
    </CardContent>
  </Card>
);

export const PatientDashboard = () => (
  <div className="grid gap-4 md:grid-cols-3">
    <div className="md:col-span-2">
      <UpcomingCard />
    </div>
    <PatientStatTiles />
    <div className="md:col-span-3">
      <QuickBookCard />
    </div>
  </div>
);
