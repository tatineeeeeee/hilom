import { CalendarCheck, CreditCard, Search, Stethoscope } from "lucide-react";

const STEPS = [
  {
    num: "1",
    icon: Search,
    title: "Search",
    body: "Filter by specialization, fee, or rating. Read reviews from other patients.",
  },
  {
    num: "2",
    icon: CalendarCheck,
    title: "Book",
    body: "Pick a slot from the doctor's live availability. Add a quick reason for the visit.",
  },
  {
    num: "3",
    icon: CreditCard,
    title: "Pay",
    body: "Confirm your payment via GCash, Maya, or card. We hold it in escrow until the visit happens.",
  },
  {
    num: "4",
    icon: Stethoscope,
    title: "Consult",
    body: "Chat in real time, get a prescription, leave a review. Money releases to the doctor.",
  },
];

export const HowItWorks = () => (
  <section className="mx-auto max-w-5xl px-4 py-12">
    <h2 className="mb-1 text-center text-3xl font-bold tracking-tight sm:text-4xl">
      How it works
    </h2>
    <p className="mb-8 text-center text-sm text-muted-foreground">
      Four steps from "I should see a doctor" to "I have a prescription."
    </p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map(({ num, icon: Icon, title, body }) => (
        <div
          key={num}
          className="flex items-start gap-4 rounded-xl border bg-card p-5 sm:flex-col sm:gap-0"
        >
          <div className="flex shrink-0 size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground sm:mb-3">
            {num}
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-sm font-semibold">{title}</h3>
              <Icon className="size-3.5 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-xs text-muted-foreground">{body}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);
