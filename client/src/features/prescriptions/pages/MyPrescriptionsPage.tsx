import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { useAuth } from "@/features/auth/hooks";
import { useMyPrescriptions } from "../hooks";

export const MyPrescriptionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isPending, isError, refetch } = useMyPrescriptions();

  const isDoctor = user?.role === "doctor";
  const heading = isDoctor ? "Prescriptions issued" : "My prescriptions";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl">
        {heading}
      </h1>

      {isPending && (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border bg-muted/40"
            />
          ))}
        </div>
      )}

      {isError && (
        <QueryErrorState
          message="Couldn't load prescriptions."
          onRetry={() => void refetch()}
        />
      )}

      {data && data.prescriptions.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border p-10 text-center">
          <FileText className="size-10 text-muted-foreground/40" aria-hidden />
          <div>
            <p className="font-medium">
              {isDoctor
                ? "No prescriptions issued yet"
                : "No prescriptions yet"}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isDoctor
                ? "Prescriptions you issue after completed appointments appear here."
                : "Prescriptions land here after a completed appointment."}
            </p>
          </div>
        </div>
      )}

      {data && data.prescriptions.length > 0 && (
        <div className="grid gap-3">
          {data.prescriptions.map((rx) => (
            <Card
              key={rx.id}
              className="cursor-pointer transition-colors hover:bg-muted/40"
              onClick={() =>
                navigate(`/appointments/${rx.appointmentId}/prescription`)
              }
            >
              <CardContent className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid gap-0.5">
                  <p className="text-sm font-medium">{rx.otherPartyName}</p>
                  <p className="text-xs text-muted-foreground">
                    {rx.appointmentDate} &middot; {rx.medicationCount}{" "}
                    {rx.medicationCount === 1 ? "medication" : "medications"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Issued{" "}
                  {new Date(rx.createdAt).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
