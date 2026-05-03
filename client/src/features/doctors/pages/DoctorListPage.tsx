import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDoctors } from "../hooks";
import { DoctorCard } from "../components/DoctorCard";
import { DoctorFilter } from "../components/DoctorFilter";
import type { DoctorFilters } from "../schemas";

const SORT_LABELS: Record<string, string> = {
  rating: "Rating",
  fee: "Fee",
  name: "Name",
};

export const DoctorListPage = () => {
  const [filters, setFilters] = useState<DoctorFilters>({
    sort: "rating",
    page: 1,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isPending } = useDoctors(filters);
  const doctors = data?.doctors ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleFiltersChange = (next: DoctorFilters) => {
    setFilters(next);
    setDrawerOpen(false);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Find a doctor
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={filters.sort ?? "rating"}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                sort: e.target.value as DoctorFilters["sort"],
                page: 1,
              }))
            }
            className="min-h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {Object.entries(SORT_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                Sort: {label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            className="md:hidden min-h-9"
            onClick={() => setDrawerOpen((o) => !o)}
          >
            Filter
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* sidebar — md+ */}
        <aside className="hidden md:block w-60 shrink-0">
          <DoctorFilter filters={filters} onChange={handleFiltersChange} />
        </aside>

        {/* mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-background p-4 shadow-xl">
              <DoctorFilter filters={filters} onChange={handleFiltersChange} />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1">
          {isPending && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          )}

          {!isPending && doctors.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No doctors match those filters.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() =>
                  setFilters({ sort: filters.sort ?? "rating", page: 1 })
                }
              >
                Clear filters
              </Button>
            </div>
          )}

          {!isPending && doctors.length > 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {doctors.map((d) => (
                  <DoctorCard key={d.id} doctor={d} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav className="mt-6 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(filters.page ?? 1) <= 1}
                    onClick={() =>
                      setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))
                    }
                  >
                    ‹
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {filters.page ?? 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(filters.page ?? 1) >= totalPages}
                    onClick={() =>
                      setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))
                    }
                  >
                    ›
                  </Button>
                </nav>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
