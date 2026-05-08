import { useState } from "react";
import { Calendar, CalendarDays, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDoctorAppointments, useUpdateAppointmentStatus } from "../hooks";
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

const initials = (full: string) =>
  full
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
          {data.appointments.map((appt) => {
            const styles = statusStyles[appt.status];
            return (
              <Card key={appt.id} className="transition-shadow hover:shadow-md">
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
                          <p className="text-xs text-muted-foreground">
                            Patient
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`shrink-0 gap-1.5 ${styles.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${styles.dot}`}
                          />
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

                        {appt.status === "completed" &&
                          !appt.hasPrescription && (
                            <LinkButton
                              to={`/appointments/${appt.id}/prescription/new`}
                              variant="outline"
                              size="sm"
                            >
                              Issue prescription
                            </LinkButton>
                          )}

                        {appt.status === "completed" &&
                          appt.hasPrescription && (
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
          })}
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
