import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { cn } from "@/lib/utils";
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

      {/* Status tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={cn(
              "flex-none rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              status === tab.value
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isPending && (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border bg-muted/40"
            />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">Could not load appointments.</p>
      )}

      {data && data.appointments.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border p-10 text-center">
          <Calendar className="size-10 text-muted-foreground/40" aria-hidden />
          <div>
            <p className="font-medium">No appointments yet</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {status
                ? `No ${status} appointments.`
                : "Book your first appointment to get started."}
            </p>
          </div>
          {!status && (
            <LinkButton to="/doctors" size="sm">
              Find a doctor
            </LinkButton>
          )}
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
