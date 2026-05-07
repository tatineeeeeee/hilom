import type { ReactNode } from "react";
import { CreditCard, Smartphone, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethod = "gcash" | "paymaya" | "card";

interface Option {
  value: PaymentMethod;
  label: string;
  description: string;
  icon: ReactNode;
}

const OPTIONS: Option[] = [
  {
    value: "gcash",
    label: "GCash",
    description: "Pay via GCash mobile wallet",
    icon: <Smartphone className="size-5 text-teal-600" />,
  },
  {
    value: "paymaya",
    label: "Maya",
    description: "Pay via Maya wallet",
    icon: <Wallet className="size-5 text-blue-600" />,
  },
  {
    value: "card",
    label: "Card",
    description: "Visa, Mastercard, JCB",
    icon: <CreditCard className="size-5 text-slate-500" />,
  },
];

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (next: PaymentMethod) => void;
  disabled?: boolean;
}

export const PaymentMethodSelector = ({
  value,
  onChange,
  disabled,
}: PaymentMethodSelectorProps) => (
  <div className="grid gap-2" role="radiogroup" aria-label="Payment method">
    {OPTIONS.map((opt) => {
      const selected = opt.value === value;
      return (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={selected}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={cn(
            "min-h-14 rounded-lg border px-4 py-3 text-left transition-colors",
            selected
              ? "border-primary bg-primary/5"
              : "border-input hover:bg-muted",
            disabled && "opacity-50",
          )}
        >
          <div className="flex items-center gap-3">
            {opt.icon}
            <div>
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </div>
          </div>
        </button>
      );
    })}
  </div>
);
