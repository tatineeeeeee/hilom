import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { PaymentStatusBadge } from "@/features/payments/components/PaymentStatusBadge";
import { useCancelAppointment } from "../hooks";
import type { Appointment } from "../schemas";
import { useAuth } from "@/features/auth/hooks";

const statusBadgeColors: Record<Appointment["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-muted text-muted-foreground",
};

const statusBarColors: Record<Appointment["status"], string> = {
  pending: "bg-amber-400",
  confirmed: "bg-blue-400",
  completed: "bg-green-500",
  cancelled: "bg-muted-foreground/30",
};

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

  return (
    <Card className="relative overflow-hidden">
      <div
        className={`absolute inset-y-0 left-0 w-1 ${statusBarColors[appointment.status]}`}
      />
      <CardContent className="flex flex-col gap-3 p-4 pl-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-1">
          <p className="text-sm font-medium">{appointment.doctorName}</p>
          <p className="text-xs text-muted-foreground">
            {appointment.specializationName}
          </p>
          <p className="text-xs text-muted-foreground">
            {appointment.appointmentDate} &middot; {appointment.slotStart}–
            {appointment.slotEnd}
          </p>
          {appointment.reason && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {appointment.reason}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={statusBadgeColors[appointment.status]}
            variant="outline"
          >
            {appointment.status}
          </Badge>

          {appointment.paymentStatus &&
            appointment.paymentStatus !== "pending" && (
              <PaymentStatusBadge status={appointment.paymentStatus} />
            )}

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
      </CardContent>
    </Card>
  );
};
