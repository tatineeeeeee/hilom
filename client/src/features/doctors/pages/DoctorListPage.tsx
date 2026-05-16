import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDoctors } from "../hooks";
import { DoctorFilter } from "../components/DoctorFilter";
import { DoctorSpecialtyChips } from "../components/DoctorSpecialtyChips";
import { DoctorResultsGrid } from "../components/DoctorResultsGrid";
import { useSpecializations } from "@/features/specializations/hooks";
import type { DoctorFilters } from "../schemas";

const SORT_LABELS: Record<string, string> = {
  rating: "Rating",
  fee: "Fee",
  name: "Name",
};

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
          aria-label="Sort doctors"
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

      <DoctorSpecialtyChips
        specs={specs ?? []}
        activeSpecIds={activeSpecIds}
        onToggle={toggleSpec}
      />

      <div className="flex gap-6">
        <aside className="hidden md:block w-56 shrink-0">
          <DoctorFilter filters={filters} onChange={handleFiltersChange} />
        </aside>

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
          <DoctorResultsGrid
            doctors={doctors}
            isPending={isPending}
            isError={isError}
            page={filters.page ?? 1}
            totalPages={totalPages}
            onRetry={() => void refetch()}
            onClearFilters={() => {
              setSearchInput("");
              setFilters({ sort: filters.sort ?? "rating", page: 1 });
            }}
            onPageChange={(next) => setFilters((f) => ({ ...f, page: next }))}
          />
        </main>
      </div>
    </div>
  );
};
