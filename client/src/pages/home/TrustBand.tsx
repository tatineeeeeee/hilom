import {
  CreditCard,
  MessageSquareText,
  Smartphone,
  ShieldCheck,
} from "lucide-react";

const PILLS = [
  { icon: ShieldCheck, label: "Verified doctors only" },
  { icon: CreditCard, label: "Escrow-secured payments" },
  { icon: MessageSquareText, label: "Real-time chat" },
  { icon: Smartphone, label: "Mobile-first" },
];

export const TrustBand = () => (
  <section className="mx-auto max-w-5xl px-4 pb-8">
    <div className="flex flex-wrap items-center justify-center gap-2">
      {PILLS.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground"
        >
          <Icon className="size-3.5 text-primary" aria-hidden />
          {label}
        </div>
      ))}
    </div>
  </section>
);
