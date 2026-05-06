const STATS = [
  { value: "500+", label: "Verified doctors" },
  { value: "★ 4.8", label: "Average rating" },
  { value: "GCash · Maya", label: "Local payment" },
  { value: "100%", label: "Escrow-secured" },
];

export const TrustBand = () => (
  <section className="mx-auto max-w-5xl px-4 pb-8">
    <div className="grid grid-cols-2 gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-4">
      {STATS.map(({ value, label }) => (
        <div
          key={label}
          className="flex flex-col items-center gap-0.5 text-center"
        >
          <span className="text-lg font-bold sm:text-xl">{value}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  </section>
);
