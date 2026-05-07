import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/lib/api/types";
import type { ReviewsResponse } from "./schemas";

export const listDoctorReviews = async (
  doctorId: string,
  page: number,
): Promise<ReviewsResponse> => {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  const { data } = await apiClient().get<ApiSuccess<ReviewsResponse>>(
    `/doctors/${encodeURIComponent(doctorId)}/reviews${qs ? `?${qs}` : ""}`,
  );
  return data.data;
};
