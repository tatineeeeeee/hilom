import { LinkButton } from "@/components/ui/link-button";

export const CTASplit = () => (
  <section className="mx-auto max-w-5xl px-4 py-12">
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border bg-linear-to-br from-[oklch(0.520_0.105_195_/_0.12)] to-card p-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          For patients
        </p>
        <h3 className="mb-3 text-2xl font-semibold">
          Stop calling clinics. Book in two taps.
        </h3>
        <p className="mb-5 text-sm text-muted-foreground">
          Sign up free, browse our verified doctor list, and book your first
          appointment in under a minute.
        </p>
        <LinkButton to="/register" size="lg">
          Sign up as a patient
        </LinkButton>
      </div>
      <div className="rounded-2xl border bg-linear-to-br from-[oklch(0.680_0.125_35_/_0.14)] to-card p-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          For doctors
        </p>
        <h3 className="mb-3 text-2xl font-semibold">
          Take control of your bookings.
        </h3>
        <p className="mb-5 text-sm text-muted-foreground">
          Set your own schedule, fee, and slot duration. Get paid via escrow —
          funds release after each completed visit.
        </p>
        <LinkButton to="/register" size="lg" variant="outline">
          Apply as a doctor
        </LinkButton>
      </div>
    </div>
  </section>
);
