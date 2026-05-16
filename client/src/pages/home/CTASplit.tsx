import { LinkButton } from "@/components/ui/link-button";

export const CTASplit = () => (
  <section className="mx-auto max-w-5xl px-4 py-12">
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Patient — stat anchor then copy */}
      <div className="flex flex-col rounded-2xl border border-primary/20 bg-primary/5 p-9">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-primary/60">
          For patients
        </p>
        <div className="mb-5 flex items-baseline gap-2">
          <span className="text-5xl font-bold leading-none text-primary">
            500+
          </span>
          <span className="text-sm text-muted-foreground">
            verified Filipino doctors
          </span>
        </div>
        <h3 className="mb-3 text-2xl font-bold leading-snug">
          Book in under a minute.
          <br />
          Pay only after you confirm.
        </h3>
        <p className="mb-8 grow text-sm leading-relaxed text-muted-foreground">
          Browse by specialty, fee, or rating. Pay via GCash, Maya, or card.
          Your prescription lands directly in your account — no clinic pickup.
        </p>
        <LinkButton to="/register" size="lg" className="self-start">
          Get started — free
        </LinkButton>
      </div>

      {/* Doctor — promise callout then copy */}
      <div className="flex flex-col rounded-2xl border border-[oklch(0.680_0.125_35/0.25)] bg-[oklch(0.680_0.125_35/0.07)] p-9">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-[oklch(0.45_0.12_35)]">
          For doctors
        </p>
        <div className="mb-5 rounded-lg bg-[oklch(0.680_0.125_35/0.12)] px-4 py-3">
          <p className="text-sm font-semibold leading-snug text-[oklch(0.38_0.10_50)]">
            You keep 100% of every consultation fee you set — no commission,
            ever.
          </p>
        </div>
        <h3 className="mb-3 text-2xl font-bold leading-snug">
          Your schedule.
          <br />
          Your rates. Your practice.
        </h3>
        <p className="mb-8 grow text-sm leading-relaxed text-muted-foreground">
          Set your own slot duration and fee. Hilom holds payment in escrow and
          releases it the moment your visit is marked complete.
        </p>
        <LinkButton
          to="/register"
          variant="outline"
          size="lg"
          className="self-start"
        >
          Apply as a doctor
        </LinkButton>
      </div>
    </div>
  </section>
);
