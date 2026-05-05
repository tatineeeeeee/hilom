import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { waitFor } from "@testing-library/react";
import { server } from "@/test/msw/server";
import { renderHookWithProviders } from "@/test/utils";
import { useDoctorReviews } from "@/features/reviews/hooks";

const API = "http://localhost:4000/api";

describe("useDoctorReviews", () => {
  it("returns reviews from the server", async () => {
    server.use(
      http.get(`${API}/doctors/:id/reviews`, () =>
        HttpResponse.json({
          success: true,
          data: {
            reviews: [
              {
                id: "rev-1",
                rating: 4,
                comment: "ok",
                patientName: "Jane Doe",
                createdAt: new Date().toISOString(),
              },
            ],
            total: 1,
            page: 1,
            pageSize: 10,
            averageRating: "4.00",
            ratingCount: 1,
          },
        }),
      ),
    );

    const { result } = renderHookWithProviders(() =>
      useDoctorReviews("doc-1", 1),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.reviews).toHaveLength(1);
    expect(result.current.data?.reviews[0]?.rating).toBe(4);
  });

  it("does not fetch when id is undefined", () => {
    const { result } = renderHookWithProviders(() =>
      useDoctorReviews(undefined, 1),
    );
    expect(result.current.fetchStatus).toBe("idle");
  });
});
