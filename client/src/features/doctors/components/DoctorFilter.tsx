import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listSpecializations } from "@/features/auth/api";
import type { DoctorFilters } from "../schemas";

interface DoctorFilterProps {
  filters: DoctorFilters;
  onChange: (filters: DoctorFilters) => void;
}

export const DoctorFilter = ({ filters, onChange }: DoctorFilterProps) => {
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const specializations = useQuery({
    queryKey: ["specializations"],
    queryFn: listSpecializations,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search: searchInput || undefined, page: 1 });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const toggleSpec = (id: number) => {
    const current = filters.specializationId ?? [];
    const next = current.includes(id)
      ? current.filter((s) => s !== id)
      : [...current, id];
    onChange({
      ...filters,
      specializationId: next.length ? next : undefined,
      page: 1,
    });
  };

  const clearAll = () => {
    setSearchInput("");
    onChange({ sort: filters.sort ?? "rating", page: 1 });
  };

  const hasFilters =
    searchInput ||
    (filters.specializationId?.length ?? 0) > 0 ||
    filters.maxFee !== undefined ||
    filters.minRating !== undefined;

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="filter-search">Search</Label>
        <Input
          id="filter-search"
          placeholder="Doctor name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {specializations.data && specializations.data.length > 0 && (
        <div className="grid gap-1.5">
          <p className="text-sm font-medium">Specialization</p>
          <div className="grid gap-1">
            {specializations.data.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  className="size-4 rounded border-input"
                  checked={(filters.specializationId ?? []).includes(s.id)}
                  onChange={() => toggleSpec(s.id)}
                />
                {s.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="filter-maxfee">Max fee (PHP)</Label>
        <Input
          id="filter-maxfee"
          type="number"
          min="0"
          placeholder="Any"
          value={filters.maxFee ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            onChange({
              ...filters,
              maxFee: val ? Number(val) : undefined,
              page: 1,
            });
          }}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="filter-minrating">Min rating</Label>
        <select
          id="filter-minrating"
          value={filters.minRating ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            onChange({
              ...filters,
              minRating: val ? Number(val) : undefined,
              page: 1,
            });
          }}
          className="min-h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Any</option>
          {[4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              ★ {r}+
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <Button variant="outline" size="sm" onClick={clearAll}>
          Clear filters
        </Button>
      )}
    </div>
  );
};
