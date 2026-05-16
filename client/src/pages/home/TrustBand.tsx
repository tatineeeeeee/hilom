import { BadgeCheck, CreditCard, Shield, Star } from "lucide-react";

const STATS = [
  {
    icon: BadgeCheck,
    value: "500+",
    label: "Verified doctors",
    iconCls: "text-primary",
  },
  {
    icon: Star,
    value: "4.8 ★",
    label: "Average rating",
    iconCls: "text-amber-500",
  },
  {
    icon: CreditCard,
    value: "GCash · Maya",
    label: "Local payments",
    iconCls: "text-[oklch(0.30_0.10_130)]",
  },
  {
    icon: Shield,
    value: "100%",
    label: "Escrow-secured",
    iconCls: "text-[oklch(0.45_0.15_250)]",
  },
];

export const TrustBand = () => (
  <section className="mx-auto max-w-5xl px-4 pb-8">
    <div className="grid grid-cols-2 divide-x divide-y rounded-2xl border bg-card sm:grid-cols-4 sm:divide-y-0">
      {STATS.map(({ icon: Icon, value, label, iconCls }) => (
        <div
          key={label}
          className="flex flex-col items-center gap-1.5 px-6 py-5 text-center"
        >
          <Icon className={`size-4 ${iconCls}`} aria-hidden />
          <span className="text-xl font-bold sm:text-2xl">{value}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  </section>
);
