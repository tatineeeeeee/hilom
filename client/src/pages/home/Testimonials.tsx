import { Quote } from "lucide-react";

interface Testimonial {
  initials: string;
  name: string;
  role: string;
  quote: string;
  hue: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    initials: "MC",
    name: "Marisol C.",
    role: "Patient · Quezon City",
    quote:
      "Booked a derma slot in two minutes from my phone. Paid via GCash, chatted with the doctor before the visit, and got my prescription right after. No more calling clinics.",
    hue: "bg-primary/10 text-primary",
  },
  {
    initials: "JR",
    name: "Dr. J. Reyes",
    role: "General Practitioner",
    quote:
      "Setting my own schedule and fee was the easiest part. Escrow keeps me out of awkward billing conversations — payment just lands once I mark the visit complete.",
    hue: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    initials: "AP",
    name: "Andrei P.",
    role: "Patient · Cebu",
    quote:
      "I cancelled an appointment after a sudden trip and got refunded automatically — no support tickets, no waiting. That alone makes me trust Hilom for the next one.",
    hue: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
];

export const Testimonials = () => (
  <section className="mx-auto max-w-5xl px-4 py-12">
    <h2 className="mb-1 text-center text-3xl font-bold tracking-tight sm:text-4xl">
      What people say
    </h2>
    <p className="mb-8 text-center text-sm text-muted-foreground">
      Patients and doctors using Hilom in real visits.
    </p>
    <div className="grid gap-4 sm:grid-cols-3">
      {TESTIMONIALS.map((t) => (
        <figure
          key={t.name}
          className="flex flex-col gap-3 rounded-xl border bg-card p-5"
        >
          <Quote className="size-5 text-primary/60" aria-hidden />
          <blockquote className="text-sm leading-relaxed text-foreground">
            &ldquo;{t.quote}&rdquo;
          </blockquote>
          <figcaption className="mt-auto flex items-center gap-3 pt-2">
            <span
              className={`flex size-9 items-center justify-center rounded-full text-xs font-semibold ${t.hue}`}
              aria-hidden
            >
              {t.initials}
            </span>
            <div className="text-xs">
              <p className="font-medium">{t.name}</p>
              <p className="text-muted-foreground">{t.role}</p>
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  </section>
);
