import { useNavigate } from "react-router-dom";
import { Banknote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/layout/PageHeader";
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PageHeader title={isDoctor ? "Payments received" : "My payments"} />

      {isPending && (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">Could not load payments.</p>
      )}

      {data && data.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border p-10 text-center">
          <Banknote className="size-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium">
              {isDoctor
                ? "No payments received yet."
                : "You haven't made any payments yet."}
            </p>
            {!isDoctor && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Book an appointment to get started.
              </p>
            )}
          </div>
          {!isDoctor && (
            <LinkButton to="/doctors" size="sm">
              Find a doctor →
            </LinkButton>
          )}
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
