import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks";
import { useMyPrescriptions } from "../hooks";

export const MyPrescriptionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isPending, isError } = useMyPrescriptions();

  const isDoctor = user?.role === "doctor";
  const heading = isDoctor ? "Prescriptions issued" : "My prescriptions";
  const emptyText = isDoctor
    ? "You haven't issued any prescriptions yet."
    : "No prescriptions yet.";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl">
        {heading}
      </h1>

      {isPending && <p className="text-sm text-muted-foreground">Loading…</p>}

      {isError && (
        <p className="text-sm text-destructive">
          Could not load prescriptions.
        </p>
      )}

      {data && data.length === 0 && (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-3">
          {data.map((rx) => (
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
