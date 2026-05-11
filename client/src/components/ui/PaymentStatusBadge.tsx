import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/types";

const colors: Record<PaymentStatus, string> = {
  pending: "bg-[oklch(0.78_0.13_85_/_0.15)] text-[oklch(0.40_0.10_85)]",
  escrowed: "bg-primary/12 text-primary",
  released: "bg-[oklch(0.70_0.13_130_/_0.15)] text-[oklch(0.30_0.10_130)]",
  refunded: "bg-muted text-muted-foreground",
};

const labels: Record<PaymentStatus, string> = {
  pending: "Awaiting payment",
  escrowed: "Paid",
  released: "Released",
  refunded: "Refunded",
};

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

export const PaymentStatusBadge = ({ status }: PaymentStatusBadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      colors[status],
    )}
  >
    {labels[status]}
  </span>
);
