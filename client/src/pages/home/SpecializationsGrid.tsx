import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listSpecializations } from "@/features/auth/api";
import { SpecializationIcon } from "./SpecializationIcon";

export const SpecializationsGrid = () => {
  const { data, isPending } = useQuery({
    queryKey: ["specializations"],
    queryFn: listSpecializations,
    staleTime: 5 * 60_000,
  });

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <h2 className="mb-1 text-center text-3xl font-bold tracking-tight sm:text-4xl">
        Browse by specialization
      </h2>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        Ten specializations and growing. Click one to see verified doctors.
      </p>

      {isPending || !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border bg-muted/40"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {data.map((s) => (
            <Link
              key={s.id}
              to={`/doctors?specializationId=${s.id}`}
              className="group flex flex-col items-start gap-2 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <SpecializationIcon name={s.iconName} className="size-5" />
              </div>
              <p className="text-sm font-medium">{s.name}</p>
              {s.description && (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {s.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};
