import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks";
import { formatPHP } from "@/lib/utils/formatCurrency";
import { PaymentStatusBadge } from "../components/PaymentStatusBadge";
import { useMyPayments } from "../hooks";

const formatDay = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const MyPaymentsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isPending, isError } = useMyPayments();

  const isDoctor = user?.role === "doctor";
  const heading = isDoctor ? "Payments received" : "My payments";
  const emptyText = isDoctor
    ? "No payments yet."
    : "You haven't paid for any appointments yet.";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl">
        {heading}
      </h1>

      {isPending && <p className="text-sm text-muted-foreground">Loading…</p>}

      {isError && (
        <p className="text-sm text-destructive">Could not load payments.</p>
      )}

      {data && data.length === 0 && (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-3">
          {data.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer transition-colors hover:bg-muted/40"
              onClick={() => navigate(`/payments/${p.appointmentId}`)}
            >
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid gap-0.5">
                  <p className="text-sm font-medium">{p.otherPartyName}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.appointmentDate} &middot; {formatPHP(p.amount)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <PaymentStatusBadge status={p.status} />
                  <p className="hidden text-xs text-muted-foreground sm:block">
                    {formatDay(p.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
