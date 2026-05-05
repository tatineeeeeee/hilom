import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UnverifiedDoctorRow } from "../components/UnverifiedDoctorRow";
import { useUnverifiedDoctors } from "../hooks";

export const DoctorVerificationPage = () => {
  const [page, setPage] = useState(1);
  const { data, isPending, isError } = useUnverifiedDoctors(page);
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  return (
    <div>
      {isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
      {isError && (
        <p className="text-sm text-destructive">Could not load queue.</p>
      )}

      {data && data.rows.length === 0 && (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No doctors awaiting verification.
          </p>
        </div>
      )}

      {data && data.rows.length > 0 && (
        <div className="grid gap-2">
          {data.rows.map((d) => (
            <UnverifiedDoctorRow key={d.id} doctor={d} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
