import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
      {isPending && (
        <div className="grid gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">Could not load queue.</p>
      )}

      {data && data.rows.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border p-10 text-center">
          <CheckCircle className="size-10 text-emerald-500" />
          <div>
            <p className="font-medium">No doctors awaiting verification.</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              All submitted profiles have been reviewed.
            </p>
          </div>
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
