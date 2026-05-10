import { Calendar, Clock, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { initials } from "@/lib/utils/initials";
import type { DoctorAppointment } from "../schemas";

const statusStyles: Record<
  DoctorAppointment["status"],
  { badge: string; dot: string }
> = {
  pending: {
    badge:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
    dot: "bg-amber-500",
  },
  confirmed: {
    badge:
      "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
    dot: "bg-blue-500",
  },
  completed: {
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
    dot: "bg-emerald-500",
  },
  cancelled: {
    badge: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/50",
  },
};

interface DoctorAppointmentCardProps {
  appt: DoctorAppointment;
  isUpdating: boolean;
  onAction: (id: string, status: string) => void;
}

export const DoctorAppointmentCard = ({
  appt,
  isUpdating,
  onAction,
}: DoctorAppointmentCardProps) => {
  const styles = statusStyles[appt.status];
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials(appt.patientName)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {appt.patientName}
                </p>
                <p className="text-xs text-muted-foreground">Patient</p>
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 gap-1.5 ${styles.badge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                {appt.status}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {appt.appointmentDate}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {appt.slotStart}–{appt.slotEnd}
              </span>
            </div>

            {appt.reason && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <FileText className="mt-0.5 size-3.5 shrink-0" />
                <span className="line-clamp-2">{appt.reason}</span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
              {appt.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => onAction(appt.id, "confirmed")}
                    disabled={isUpdating}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAction(appt.id, "cancelled")}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                </>
              )}

              {appt.status === "confirmed" && (
                <>
                  <LinkButton
                    to={`/appointments/${appt.id}/chat`}
                    variant="outline"
                    size="sm"
                  >
                    Chat
                  </LinkButton>
                  <Button
                    size="sm"
                    onClick={() => onAction(appt.id, "completed")}
                    disabled={isUpdating}
                  >
                    Mark complete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAction(appt.id, "cancelled")}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                </>
              )}

              {appt.status === "completed" && !appt.hasPrescription && (
                <LinkButton
                  to={`/appointments/${appt.id}/prescription/new`}
                  variant="outline"
                  size="sm"
                >
                  Issue prescription
                </LinkButton>
              )}

              {appt.status === "completed" && appt.hasPrescription && (
                <LinkButton
                  to={`/appointments/${appt.id}/prescription`}
                  variant="outline"
                  size="sm"
                >
                  View prescription
                </LinkButton>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
