import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/lib/api/types";
import type {
  AdminListResult,
  AdminUserRow,
  PlatformStats,
  UnverifiedDoctorRow,
} from "./schemas";

interface ListUsersParams {
  page?: number;
  role?: "patient" | "doctor" | "admin";
  search?: string;
}

export const listUsers = async (
  params: ListUsersParams,
): Promise<AdminListResult<AdminUserRow>> => {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.role) search.set("role", params.role);
  if (params.search) search.set("search", params.search);
  const qs = search.toString();
  const { data } = await apiClient().get<
    ApiSuccess<AdminListResult<AdminUserRow>>
  >(`/admin/users${qs ? `?${qs}` : ""}`);
  return data.data;
};

export const listUnverifiedDoctors = async (
  page = 1,
): Promise<AdminListResult<UnverifiedDoctorRow>> => {
  const search = new URLSearchParams();
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  const { data } = await apiClient().get<
    ApiSuccess<AdminListResult<UnverifiedDoctorRow>>
  >(`/admin/doctors/unverified${qs ? `?${qs}` : ""}`);
  return data.data;
};

export const verifyDoctor = async (
  doctorProfileId: string,
  isVerified: boolean,
): Promise<unknown> => {
  const { data } = await apiClient().patch<ApiSuccess<unknown>>(
    `/admin/doctors/${encodeURIComponent(doctorProfileId)}/verify`,
    { isVerified },
  );
  return data.data;
};

export const getPlatformStats = async (): Promise<PlatformStats> => {
  const { data } =
    await apiClient().get<ApiSuccess<{ stats: PlatformStats }>>("/admin/stats");
  return data.data.stats;
};
