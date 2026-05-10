import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/ui/query-error-state";
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
  const { data, isPending, isError, refetch } = useDoctorReviews(
    doctorId,
    page,
  );

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;
  const avg = data?.averageRating
    ? Number(data.averageRating).toFixed(1)
    : null;

  const distData = data
    ? [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: data.reviews.filter((r) => r.rating === star).length,
      }))
    : [];
  const maxDistCount = Math.max(...distData.map((d) => d.count), 1);

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

        {data && data.ratingCount > 0 && (
          <div className="mt-2 grid gap-1.5">
            {distData.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-8 text-right text-muted-foreground">
                  {star} ★
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-amber-400 transition-all"
                    style={{
                      width: `${(count / maxDistCount) * 100}%`,
                    }}
                  />
                </div>
                <span className="w-4 text-right text-muted-foreground">
                  {count}
                </span>
              </div>
            ))}
            {data.total > data.pageSize && (
              <p className="mt-1 text-xs text-muted-foreground">
                From recent {data.pageSize} reviews
              </p>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="grid gap-3">
        {isPending && (
          <>
            <Skeleton className="mb-2 h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </>
        )}

        {isError && (
          <QueryErrorState
            message="Couldn't load reviews."
            onRetry={() => void refetch()}
          />
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
