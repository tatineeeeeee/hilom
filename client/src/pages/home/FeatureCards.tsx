import { CreditCard, MessageSquareText, ShieldCheck } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Verified doctors only",
    body: "Every doctor on the public list has been reviewed by our admin team. Credentials, specialization, and fee are visible up-front — no surprises.",
    iconCls: "bg-primary/10 text-primary",
    tint: "from-primary/6",
  },
  {
    icon: CreditCard,
    title: "Escrow payments",
    body: "Pay with GCash, Maya, or any major card. Funds are held until your visit completes. Cancel before it does and you're refunded automatically.",
    iconCls: "bg-[oklch(0.70_0.13_130/0.15)] text-[oklch(0.30_0.10_130)]",
    tint: "from-[oklch(0.70_0.13_130/0.06)]",
  },
  {
    icon: MessageSquareText,
    title: "Chat & prescriptions",
    body: "Once your booking is confirmed, message your doctor in real time. Your prescription lands directly in your account — no clinic pickups needed.",
    iconCls: "bg-[oklch(0.88_0.06_50/0.30)] text-[oklch(0.40_0.10_50)]",
    tint: "from-[oklch(0.88_0.06_50/0.08)]",
  },
];

export const FeatureCards = () => (
  <section className="mx-auto max-w-5xl px-4 py-12">
    <div className="grid gap-4 sm:grid-cols-3">
      {FEATURES.map(({ icon: Icon, title, body, iconCls, tint }) => (
        <div
          key={title}
          className={`flex flex-col rounded-xl border bg-linear-to-br ${tint} to-card p-5 shadow-sm transition-shadow hover:shadow-md`}
        >
          <div
            className={`mb-4 flex size-10 items-center justify-center rounded-lg ${iconCls}`}
          >
            <Icon className="size-5" aria-hidden />
          </div>
          <h3 className="mb-2 text-base font-semibold">{title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {body}
          </p>
        </div>
      ))}
    </div>
  </section>
);
