import { Link } from "react-router-dom";
import { useSpecializations } from "@/features/specializations/hooks";
import { SpecializationIcon } from "./SpecializationIcon";

export const SpecializationsGrid = () => {
  const { data, isPending } = useSpecializations();

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <h2 className="mb-1 text-center text-3xl font-bold tracking-tight sm:text-4xl">
        Browse by specialization
      </h2>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        Ten specializations and growing. Tap one to see verified doctors.
      </p>

      {isPending || !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border bg-muted/40"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {data.map((s) => (
            <Link
              key={s.id}
              to={`/doctors?specializationId=${s.id}`}
              className="group flex flex-col items-center gap-2.5 rounded-xl border bg-card p-4 text-center transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.97]"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                <SpecializationIcon name={s.iconName} className="size-5" />
              </div>
              <p className="text-xs font-medium leading-snug">{s.name}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};
