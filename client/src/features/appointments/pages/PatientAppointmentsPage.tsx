import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMyAppointments } from "../hooks";
import { AppointmentCard } from "../components/AppointmentCard";
import { ReviewModal } from "../components/ReviewModal";
import type { Appointment } from "../schemas";

const TABS = [
  { label: "All", value: undefined },
  { label: "Pending", value: "pending" as const },
  { label: "Confirmed", value: "confirmed" as const },
  { label: "Completed", value: "completed" as const },
  { label: "Cancelled", value: "cancelled" as const },
];

export const PatientAppointmentsPage = () => {
  const [status, setStatus] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [reviewTarget, setReviewTarget] = useState<Appointment | null>(null);

  const { data, isPending, isError } = useMyAppointments({ status, page });

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl">
        My appointments
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
            No appointments yet.{" "}
            <Link to="/doctors" className="text-primary underline">
              Find a doctor
            </Link>{" "}
            to book your first slot.
          </p>
        </div>
      )}

      {data && data.appointments.length > 0 && (
        <div className="grid gap-3">
          {data.appointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              onReview={setReviewTarget}
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

      {reviewTarget && (
        <ReviewModal
          appointment={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => setReviewTarget(null)}
        />
      )}
    </div>
  );
};
