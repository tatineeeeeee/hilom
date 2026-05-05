import { Link } from "react-router-dom";
import { useDoctors } from "@/features/doctors/hooks";
import { formatPHP } from "@/lib/utils/formatCurrency";

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("") || "Dr";

export const FeaturedDoctors = () => {
  const { data, isPending } = useDoctors({
    page: 1,
    sort: "rating",
  });

  const doctors = data?.doctors.slice(0, 3) ?? [];

  if (!isPending && doctors.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Meet some of our doctors
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Top-rated, verified, and accepting new patients.
          </p>
        </div>
        <Link
          to="/doctors"
          className="text-sm font-medium text-primary hover:underline"
        >
          See all →
        </Link>
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border bg-muted/40"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {doctors.map((d) => {
            const rating = d.averageRating
              ? Number(d.averageRating).toFixed(1)
              : null;
            return (
              <Link
                key={d.id}
                to={`/doctors/${d.id}`}
                className="group rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {initials(d.fullName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {d.fullName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.specializationName}
                    </p>
                  </div>
                </div>
                {d.bio && (
                  <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                    {d.bio}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    <span className="text-amber-400">★</span> {rating ?? "New"}
                  </span>
                  <span className="font-medium">
                    {formatPHP(d.consultationFee)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};
