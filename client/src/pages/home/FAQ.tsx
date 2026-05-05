import { ChevronDown } from "lucide-react";

const ITEMS = [
  {
    q: "Is my payment safe?",
    a: "Yes. Payments go through PayMongo (GCash, Maya, or any major card). Funds are held in escrow on our side until your visit completes. Cancel before the visit and you're refunded automatically.",
  },
  {
    q: "How are doctors verified?",
    a: "Every doctor in the public list has been reviewed by our admin team. Unverified doctors don't appear in search until their profile is approved — even if they've signed up.",
  },
  {
    q: "What happens if I need to cancel?",
    a: "You can cancel any pending or confirmed appointment from /appointments. If you've already paid, the refund is automatic. If the visit hasn't been paid for yet, the booking just closes out — no charge.",
  },
  {
    q: "Can I message my doctor before the visit?",
    a: "Yes. Once the doctor confirms your booking, a private real-time chat opens between you. Read receipts, message history, and unread badges all work out of the box.",
  },
  {
    q: "How do I get my prescription?",
    a: "After the visit is marked complete, the doctor issues a digital prescription. It lands in your account immediately — visible in /prescriptions and on the appointment detail page.",
  },
  {
    q: "Is Hilom available outside the Philippines?",
    a: "Not yet. Currency is PHP, payments are PH-only via PayMongo, and the doctor pool is being grown locally first. International expansion is on the roadmap.",
  },
];

export const FAQ = () => (
  <section className="mx-auto max-w-3xl px-4 py-12">
    <h2 className="mb-1 text-center text-3xl font-bold tracking-tight sm:text-4xl">
      Frequently asked
    </h2>
    <p className="mb-8 text-center text-sm text-muted-foreground">
      The short answers to the questions we hear most.
    </p>
    <div className="grid gap-3">
      {ITEMS.map((item) => (
        <details
          key={item.q}
          className="group rounded-xl border bg-card p-4 [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
            <span>{item.q}</span>
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {item.a}
          </p>
        </details>
      ))}
    </div>
  </section>
);
