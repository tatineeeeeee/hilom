import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDoctorAppointments, useUpdateAppointmentStatus } from "../hooks";
import { AppointmentStatusTabs } from "../components/AppointmentStatusTabs";
import { DoctorAppointmentCard } from "../components/DoctorAppointmentCard";

export const DoctorAppointmentsPage = () => {
  const [status, setStatus] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const { data, isPending, isError, refetch } = useDoctorAppointments({
    status,
    page,
  });
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

      <AppointmentStatusTabs
        status={status}
        onChange={(next) => {
          setStatus(next);
          setPage(1);
        }}
      />

      {isPending && (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <QueryErrorState
          message="Couldn't load appointments."
          onRetry={() => void refetch()}
        />
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
            <DoctorAppointmentCard
              key={appt.id}
              appt={appt}
              isUpdating={isUpdating}
              onAction={handleAction}
            />
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
