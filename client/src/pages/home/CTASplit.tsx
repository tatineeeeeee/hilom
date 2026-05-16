import { Check } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { BorderBeam } from "@/components/ui/border-beam";

const PATIENT_PERKS = [
  "No registration fee, ever",
  "Pay with GCash, Maya, or card",
  "Browse only verified doctors",
];

const DOCTOR_PERKS = [
  "Set your own schedule and fee",
  "Escrow ensures on-time payment",
  "Keep 100% of every consultation",
];

export const CTASplit = () => (
  <section className="mx-auto max-w-5xl px-4 py-12">
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Patient — filled/bold */}
      <div className="relative flex flex-col overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary-foreground/60">
          For patients
        </p>
        <h3 className="mb-3 text-2xl font-semibold leading-snug">
          Stop calling clinics.
          <br />
          Book in two taps.
        </h3>
        <p className="mb-5 text-sm text-primary-foreground/75">
          Sign up free, browse our verified doctor list, and book your first
          appointment in under a minute.
        </p>
        <ul className="mb-6 grow space-y-2.5">
          {PATIENT_PERKS.map((perk) => (
            <li
              key={perk}
              className="flex items-center gap-2 text-sm text-primary-foreground/85"
            >
              <Check className="size-3.5 shrink-0" aria-hidden />
              {perk}
            </li>
          ))}
        </ul>
        <LinkButton
          to="/register"
          size="lg"
          className="self-start bg-white text-primary hover:bg-white/90 focus-visible:ring-white"
        >
          Get started — free
        </LinkButton>
        <BorderBeam
          size={250}
          duration={10}
          colorFrom="oklch(0.88 0.06 50)"
          colorTo="oklch(1 0 0 / 0.55)"
        />
      </div>

      {/* Doctor — warm tinted */}
      <div className="relative flex flex-col overflow-hidden rounded-2xl border bg-linear-to-br from-[oklch(0.680_0.125_35/0.14)] to-card p-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          For doctors
        </p>
        <h3 className="mb-3 text-2xl font-semibold leading-snug">
          Take control of your bookings.
        </h3>
        <p className="mb-5 text-sm text-muted-foreground">
          Set your own schedule, fee, and slot duration. Get paid via escrow —
          funds release after each completed visit.
        </p>
        <ul className="mb-6 grow space-y-2.5">
          {DOCTOR_PERKS.map((perk) => (
            <li
              key={perk}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Check
                className="size-3.5 shrink-0 text-[oklch(0.40_0.10_50)]"
                aria-hidden
              />
              {perk}
            </li>
          ))}
        </ul>
        <LinkButton to="/register" size="lg" className="self-start">
          Apply as a doctor
        </LinkButton>
        <BorderBeam
          size={250}
          duration={12}
          colorFrom="oklch(0.680 0.125 35)"
          colorTo="oklch(0.520 0.105 195)"
        />
      </div>
    </div>
  </section>
);
