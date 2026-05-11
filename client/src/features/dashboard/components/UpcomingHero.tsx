import { Stethoscope } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyAppointments } from "@/features/appointments/hooks";
import { initials } from "@/lib/utils/initials";
import type { Appointment } from "@/features/appointments/schemas";

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

const formatDate = (isoDate: string): string =>
  new Date(isoDate).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const STATUS_DOT: Record<string, string> = {
  pending: "bg-[oklch(0.78_0.13_85)]",
  confirmed: "bg-primary",
  completed: "bg-[oklch(0.70_0.13_130)]",
  cancelled: "bg-muted-foreground",
};

const STATUS_TINT: Record<string, string> = {
  pending:
    "bg-linear-to-br from-[oklch(0.780_0.130_85_/_0.16)] via-background to-card",
  confirmed:
    "bg-linear-to-br from-[oklch(0.520_0.105_195_/_0.14)] via-background to-card",
  completed:
    "bg-linear-to-br from-[oklch(0.700_0.130_130_/_0.16)] via-background to-card",
  cancelled: "bg-linear-to-br from-muted via-background to-card",
};

const HeroCard = ({ appt }: { appt: Appointment }) => {
  const countdown = daysUntil(appt.appointmentDate);

  return (
    <Card className={STATUS_TINT[appt.status] ?? STATUS_TINT.pending}>
      <CardContent className="pt-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {initials(appt.doctorName)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-semibold leading-tight">
                {appt.doctorName}
              </p>
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 text-xs"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[appt.status] ?? "bg-muted-foreground"}`}
                />
                {appt.status}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {appt.specializationName}
            </p>
            <p className="mt-2 text-sm font-medium">
              {formatDate(appt.appointmentDate)}
            </p>
            <p className="text-xs text-muted-foreground">
              {appt.slotStart}–{appt.slotEnd}
            </p>
          </div>

          <Badge
            variant="secondary"
            className="shrink-0 self-start text-xs font-medium text-primary"
          >
            {countdown}
          </Badge>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {appt.paymentStatus === "pending" && (
            <LinkButton to="/payments" size="sm">
              Pay now
            </LinkButton>
          )}
          {appt.status === "confirmed" && (
            <LinkButton
              to={`/appointments/${appt.id}/chat`}
              size="sm"
              variant="outline"
            >
              Chat
            </LinkButton>
          )}
          <LinkButton
            to={`/doctors/${appt.doctorId}`}
            size="sm"
            variant="ghost"
          >
            Reschedule
          </LinkButton>
          {appt.status === "completed" && appt.hasPrescription && (
            <LinkButton
              to={`/appointments/${appt.id}/prescription`}
              size="sm"
              variant="outline"
            >
              View prescription
            </LinkButton>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const EmptyHero = () => (
  <Card className="bg-linear-to-br from-primary/8 via-background to-accent/15">
    <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
      <Stethoscope className="size-12 text-primary/40" />
      <div>
        <p className="font-medium">No upcoming appointments</p>
        <p className="text-sm text-muted-foreground">
          Find a doctor and book your first visit.
        </p>
      </div>
      <LinkButton to="/doctors" size="sm">
        Book your first visit
      </LinkButton>
    </CardContent>
  </Card>
);

export const UpcomingHero = () => {
  const { data, isPending } = useMyAppointments({ page: 1 });

  if (isPending) return <Skeleton className="h-44 rounded-xl" />;

  const next = data?.appointments.find(
    (a) => a.status === "pending" || a.status === "confirmed",
  );

  return next ? <HeroCard appt={next} /> : <EmptyHero />;
};
