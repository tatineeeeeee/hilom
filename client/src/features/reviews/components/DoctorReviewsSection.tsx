import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDoctorReviews } from "../hooks";
import { ReviewItem } from "./ReviewItem";
import { StarBar } from "./StarBar";

interface DoctorReviewsSectionProps {
  doctorId: string;
}

export const DoctorReviewsSection = ({
  doctorId,
}: DoctorReviewsSectionProps) => {
  const [page, setPage] = useState(1);
  const { data, isPending, isError } = useDoctorReviews(doctorId, page);

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;
  const avg = data?.averageRating
    ? Number(data.averageRating).toFixed(1)
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Reviews</CardTitle>
          {data && data.ratingCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <StarBar value={Number(data.averageRating ?? 0)} />
              <span className="font-medium">{avg}</span>
              <span className="text-muted-foreground">
                · {data.ratingCount}{" "}
                {data.ratingCount === 1 ? "review" : "reviews"}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {isPending && (
          <p className="text-sm text-muted-foreground">Loading reviews…</p>
        )}

        {isError && (
          <p className="text-sm text-destructive">Could not load reviews.</p>
        )}

        {data && data.reviews.length === 0 && (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        )}

        {data && data.reviews.map((r) => <ReviewItem key={r.id} review={r} />)}

        {data && totalPages > 1 && (
          <div className="mt-2 flex items-center justify-center gap-2">
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
      </CardContent>
    </Card>
  );
};
