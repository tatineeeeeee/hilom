import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatPHP } from "@/lib/utils/formatCurrency";
import { useAuth } from "@/features/auth/hooks";
import { PaymentMethodSelector } from "../components/PaymentMethodSelector";
import type { PaymentMethod } from "../components/PaymentMethodSelector";
import { PaymentStatusCard } from "../components/PaymentStatusCard";
import { useConfirmPaymentMock, usePaymentByAppointment } from "../hooks";

export const PaymentPage = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [method, setMethod] = useState<PaymentMethod>("gcash");

  const {
    data: payment,
    isPending,
    isError,
  } = usePaymentByAppointment(appointmentId);

  const { mutate: confirm, isPending: confirming } = useConfirmPaymentMock(
    appointmentId ?? "",
  );

  if (isPending) {
    return (
      <div className="mx-auto max-w-xl px-4 py-6">
        <PageHeader title="Payment" />
        <div className="grid gap-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      </div>
    );
  }

  if (isError || !payment) {
    return (
      <div className="mx-auto max-w-xl px-4 py-6">
        <p className="text-sm text-destructive">
          Could not load this payment. Please try again later.
        </p>
      </div>
    );
  }

  const isOwner = user?.id === payment.patientId;
  const canPay = isOwner && payment.status === "pending";

  const handlePay = () => {
    confirm(undefined, {
      onSuccess: () => {
        toast.success("Payment confirmed");
        navigate("/appointments");
      },
      onError: () => toast.error("Payment failed — please try again"),
    });
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <PageHeader
        title="Payment"
        subtitle="Consultation fee for your appointment"
        action={
          <Link
            to="/appointments"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back
          </Link>
        }
      />

      <div className="mb-6 rounded-lg border p-5 text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Amount due
        </p>
        <p className="mt-1 text-3xl font-bold">{formatPHP(payment.amount)}</p>
      </div>

      <div className="mb-6">
        <PaymentStatusCard status={payment.status} />
      </div>

      {canPay && (
        <>
          <p className="mb-2 text-sm font-medium">Choose payment method</p>
          <div className="mb-6">
            <PaymentMethodSelector
              value={method}
              onChange={setMethod}
              disabled={confirming}
            />
          </div>
          <Button className="w-full" onClick={handlePay} disabled={confirming}>
            {confirming ? "Confirming…" : `Pay ${formatPHP(payment.amount)}`}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Test environment — no real charge will be made.
          </p>
        </>
      )}

      {!canPay && (
        <LinkButton to="/appointments" variant="outline" className="w-full">
          Back to appointments
        </LinkButton>
      )}
    </div>
  );
};
