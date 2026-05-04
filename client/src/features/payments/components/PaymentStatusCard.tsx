import { CheckCircle2, Clock, RefreshCcw, Wallet } from "lucide-react";
import type { PaymentStatus } from "../schemas";

interface PaymentStatusCardProps {
  status: PaymentStatus;
}

const COPY: Record<
  PaymentStatus,
  {
    title: string;
    body: string;
    Icon: typeof Clock;
    accent: string;
  }
> = {
  pending: {
    title: "Awaiting payment",
    body: "Choose a method below and confirm to hold your slot.",
    Icon: Clock,
    accent: "text-amber-600",
  },
  escrowed: {
    title: "Paid — held for your appointment",
    body: "We'll release this to the doctor once the visit is completed.",
    Icon: Wallet,
    accent: "text-blue-600",
  },
  released: {
    title: "Released to the doctor",
    body: "Thanks for using Hilom. You can review your appointment any time.",
    Icon: CheckCircle2,
    accent: "text-green-600",
  },
  refunded: {
    title: "Refunded",
    body: "The amount has been returned to your original payment method.",
    Icon: RefreshCcw,
    accent: "text-muted-foreground",
  },
};

export const PaymentStatusCard = ({ status }: PaymentStatusCardProps) => {
  const { title, body, Icon, accent } = COPY[status];
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
      <Icon className={`mt-0.5 size-5 ${accent}`} aria-hidden />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
};
