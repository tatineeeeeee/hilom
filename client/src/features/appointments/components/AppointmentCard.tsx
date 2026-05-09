import { Calendar, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import { useCancelAppointment } from "../hooks";
import type { Appointment } from "../schemas";
import { useAuth } from "@/features/auth/hooks";

const statusStyles: Record<
  Appointment["status"],
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

const initials = (full: string) =>
  full
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

interface AppointmentCardProps {
  appointment: Appointment;
  onReview?: (appointment: Appointment) => void;
}

export const AppointmentCard = ({
  appointment,
  onReview,
}: AppointmentCardProps) => {
  const { user } = useAuth();
  const { mutate: cancel, isPending } = useCancelAppointment();

  const handleCancel = () => {
    cancel(appointment.id, {
      onSuccess: () => toast.success("Appointment cancelled"),
      onError: () => toast.error("Failed to cancel"),
    });
  };

  const styles = statusStyles[appointment.status];

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials(appointment.doctorName)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {appointment.doctorName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {appointment.specializationName}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                <Badge variant="outline" className={`gap-1.5 ${styles.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                  {appointment.status}
                </Badge>
                {appointment.paymentStatus &&
                  appointment.paymentStatus !== "pending" && (
                    <PaymentStatusBadge status={appointment.paymentStatus} />
                  )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {appointment.appointmentDate}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {appointment.slotStart}–{appointment.slotEnd}
              </span>
            </div>

            {appointment.reason && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <FileText className="mt-0.5 size-3.5 shrink-0" />
                <span className="line-clamp-2">{appointment.reason}</span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
              {appointment.paymentStatus === "pending" &&
                appointment.status !== "cancelled" &&
                user?.role === "patient" && (
                  <LinkButton to={`/payments/${appointment.id}`} size="sm">
                    Pay now
                  </LinkButton>
                )}

              {appointment.status === "pending" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              )}

              {appointment.status === "confirmed" && (
                <LinkButton
                  to={`/appointments/${appointment.id}/chat`}
                  variant="outline"
                  size="sm"
                >
                  Chat
                </LinkButton>
              )}

              {appointment.status === "completed" &&
                !appointment.hasReview &&
                onReview && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReview(appointment)}
                  >
                    Leave a review
                  </Button>
                )}

              {appointment.status === "completed" &&
                appointment.hasPrescription && (
                  <LinkButton
                    to={`/appointments/${appointment.id}/prescription`}
                    variant="outline"
                    size="sm"
                  >
                    View prescription
                  </LinkButton>
                )}

              {appointment.status === "completed" &&
                !appointment.hasPrescription &&
                user?.role === "doctor" && (
                  <LinkButton
                    to={`/appointments/${appointment.id}/prescription/new`}
                    variant="outline"
                    size="sm"
                  >
                    Issue prescription
                  </LinkButton>
                )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
