import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/lib/api/types";
import type { Specialization } from "@/types";

export const listSpecializations = async (): Promise<Specialization[]> => {
  const { data } =
    await apiClient().get<ApiSuccess<Specialization[]>>("/specializations");
  return data.data;
};
