import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/lib/api/types";
import type { DoctorStats } from "./schemas";

export const getDoctorStats = async (): Promise<DoctorStats> => {
  const { data } =
    await apiClient().get<ApiSuccess<{ stats: DoctorStats }>>(
      "/me/doctor-stats",
    );
  return data.data.stats;
};
