import { Button } from "@/components/ui/button";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { DoctorCard } from "./DoctorCard";
import type { PublicDoctor } from "../schemas";

const DoctorCardSkeleton = () => (
  <div className="h-36 animate-pulse rounded-xl border bg-muted/40" />
);

interface DoctorResultsGridProps {
  doctors: PublicDoctor[];
  isPending: boolean;
  isError: boolean;
  page: number;
  totalPages: number;
  onRetry: () => void;
  onClearFilters: () => void;
  onPageChange: (next: number) => void;
}

export const DoctorResultsGrid = ({
  doctors,
  isPending,
  isError,
  page,
  totalPages,
  onRetry,
  onClearFilters,
  onPageChange,
}: DoctorResultsGridProps) => {
  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <DoctorCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <QueryErrorState message="Couldn't load doctors." onRetry={onRetry} />
    );
  }

  if (doctors.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No doctors match those filters.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={onClearFilters}
        >
          Clear all filters
        </Button>
      </div>
    );
  }

  return (
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
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ‹
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            ›
          </Button>
        </nav>
      )}
    </>
  );
};
