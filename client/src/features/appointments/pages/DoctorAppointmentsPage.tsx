import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDoctorAppointments, useUpdateAppointmentStatus } from "../hooks";
import type { DoctorAppointment } from "../schemas";

const statusBadgeColors: Record<DoctorAppointment["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-muted text-muted-foreground",
};

const statusBarColors: Record<DoctorAppointment["status"], string> = {
  pending: "bg-amber-400",
  confirmed: "bg-blue-400",
  completed: "bg-green-500",
  cancelled: "bg-muted-foreground/30",
};

const TABS = [
  { label: "All", value: undefined },
  { label: "Pending", value: "pending" as const },
  { label: "Confirmed", value: "confirmed" as const },
  { label: "Completed", value: "completed" as const },
  { label: "Cancelled", value: "cancelled" as const },
];

export const DoctorAppointmentsPage = () => {
  const [status, setStatus] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const { data, isPending, isError } = useDoctorAppointments({ status, page });
  const { mutate: updateStatus, isPending: isUpdating } =
    useUpdateAppointmentStatus();

  const handleAction = (id: string, newStatus: string) => {
    updateStatus(
      { id, status: newStatus },
      {
        onSuccess: () => toast.success(`Appointment ${newStatus}`),
        onError: () => toast.error("Failed to update status"),
      },
    );
  };

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PageHeader title="Patient appointments" />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.label}
            variant={status === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isPending && (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">Could not load appointments.</p>
      )}

      {data && data.appointments.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border p-10 text-center">
          <CalendarDays className="size-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium">No appointments to show</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {status
                ? `No ${status} appointments.`
                : "Patients will appear here after they book."}
            </p>
          </div>
        </div>
      )}

      {data && data.appointments.length > 0 && (
        <div className="grid gap-3">
          {data.appointments.map((appt) => (
            <Card key={appt.id} className="relative overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 w-1 ${statusBarColors[appt.status]}`}
              />
              <CardContent className="flex flex-col gap-3 p-4 pl-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid gap-1">
                  <p className="text-sm font-medium">{appt.patientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {appt.appointmentDate} &middot; {appt.slotStart}–
                    {appt.slotEnd}
                  </p>
                  {appt.reason && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {appt.reason}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={statusBadgeColors[appt.status]}
                    variant="outline"
                  >
                    {appt.status}
                  </Badge>

                  {appt.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleAction(appt.id, "confirmed")}
                        disabled={isUpdating}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(appt.id, "cancelled")}
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
                        onClick={() => handleAction(appt.id, "completed")}
                        disabled={isUpdating}
                      >
                        Mark complete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(appt.id, "cancelled")}
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
