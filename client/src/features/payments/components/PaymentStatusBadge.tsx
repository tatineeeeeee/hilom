import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "../schemas";

const colors: Record<PaymentStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  escrowed: "bg-blue-100 text-blue-800",
  released: "bg-green-100 text-green-800",
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
  <Badge className={colors[status]} variant="outline">
    {labels[status]}
  </Badge>
);
