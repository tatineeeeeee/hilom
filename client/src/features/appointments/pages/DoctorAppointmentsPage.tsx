import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDoctorAppointments, useUpdateAppointmentStatus } from "../hooks";
import type { DoctorAppointment } from "../schemas";

const statusColors: Record<DoctorAppointment["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-muted text-muted-foreground",
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
      <h1 className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl">
        Patient appointments
      </h1>

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

      {isPending && <p className="text-sm text-muted-foreground">Loading…</p>}

      {isError && (
        <p className="text-sm text-destructive">Could not load appointments.</p>
      )}

      {data && data.appointments.length === 0 && (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No appointments to show.
          </p>
        </div>
      )}

      {data && data.appointments.length > 0 && (
        <div className="grid gap-3">
          {data.appointments.map((appt) => (
            <Card key={appt.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
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
                    className={statusColors[appt.status]}
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
