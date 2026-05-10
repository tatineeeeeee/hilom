import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { cn } from "@/lib/utils";
import { useDoctors } from "../hooks";
import { DoctorCard } from "../components/DoctorCard";
import { DoctorFilter } from "../components/DoctorFilter";
import { useSpecializations } from "@/features/specializations/hooks";
import type { DoctorFilters } from "../schemas";

const SORT_LABELS: Record<string, string> = {
  rating: "Rating",
  fee: "Fee",
  name: "Name",
};

const DoctorCardSkeleton = () => (
  <div className="h-36 animate-pulse rounded-xl border bg-muted/40" />
);

export const DoctorListPage = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  const initialSpecId = searchParams.get("specializationId");

  const [filters, setFilters] = useState<DoctorFilters>({
    sort: "rating",
    page: 1,
    search: initialSearch || undefined,
    specializationId: initialSpecId ? [Number(initialSpecId)] : undefined,
  });
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: specs } = useSpecializations();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput || undefined, page: 1 }));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const { data, isPending, isError, refetch } = useDoctors(filters);
  const doctors = data?.doctors ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleFiltersChange = (next: DoctorFilters) => {
    setFilters(next);
    setDrawerOpen(false);
  };

  const toggleSpec = (id: number) => {
    const current = filters.specializationId ?? [];
    const next = current.includes(id)
      ? current.filter((s) => s !== id)
      : [...current, id];
    setFilters((f) => ({
      ...f,
      specializationId: next.length ? next : undefined,
      page: 1,
    }));
  };

  const activeSpecIds = filters.specializationId ?? [];
  const hasActiveFilters =
    activeSpecIds.length > 0 ||
    filters.maxFee !== undefined ||
    filters.minRating !== undefined;
  const activeFilterCount =
    activeSpecIds.length +
    (filters.maxFee !== undefined ? 1 : 0) +
    (filters.minRating !== undefined ? 1 : 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl">
        Find a doctor
      </h1>

      {/* Search bar */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, specialty, or symptom…"
            className="pl-9"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
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
          className={cn(
            "md:hidden min-h-9 gap-1.5",
            hasActiveFilters && "border-primary text-primary",
          )}
          onClick={() => setDrawerOpen((o) => !o)}
        >
          <SlidersHorizontal className="size-4" />
          {hasActiveFilters ? `Filter (${activeFilterCount})` : "Filter"}
        </Button>
      </div>

      {/* Specialty chips — horizontal scroll on mobile */}
      {specs && specs.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:pb-0">
          {specs.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleSpec(s.id)}
              className={cn(
                "flex-none rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activeSpecIds.includes(s.id)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar filter — md+ */}
        <aside className="hidden md:block w-56 shrink-0">
          <DoctorFilter filters={filters} onChange={handleFiltersChange} />
        </aside>

        {/* Mobile bottom sheet filter */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-background px-4 pb-8 pt-4 shadow-xl">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
              <p className="mb-4 text-sm font-semibold">Filter doctors</p>
              <DoctorFilter filters={filters} onChange={handleFiltersChange} />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1">
          {isPending && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <DoctorCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!isPending && isError && (
            <QueryErrorState
              message="Couldn't load doctors."
              onRetry={() => void refetch()}
            />
          )}

          {!isPending && !isError && doctors.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No doctors match those filters.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setSearchInput("");
                  setFilters({ sort: filters.sort ?? "rating", page: 1 });
                }}
              >
                Clear all filters
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
