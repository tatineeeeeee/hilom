import { CreditCard, MessageSquareText, ShieldCheck } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Verified doctors only",
    body: "Every doctor in the public list has been reviewed by our admin team. Credentials, specialization, and consultation fee are visible up-front.",
  },
  {
    icon: CreditCard,
    title: "Escrow payments",
    body: "Pay with GCash, Maya, or any major card. Funds are held until your visit completes. Cancel before completion and you're refunded automatically.",
  },
  {
    icon: MessageSquareText,
    title: "Chat & prescriptions",
    body: "Once a booking is confirmed, message your doctor in real time. Your prescription lands directly in your account — no clinic pickups.",
  },
];

export const FeatureCards = () => (
  <section className="mx-auto max-w-5xl px-4 py-12">
    <div className="grid gap-4 sm:grid-cols-3">
      {FEATURES.map(({ icon: Icon, title, body }) => (
        <div key={title} className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="size-5" aria-hidden />
          </div>
          <h3 className="mb-1.5 text-base font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
      ))}
    </div>
  </section>
);
