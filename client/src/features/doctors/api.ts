import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/lib/api/types";
import type { DoctorFilters, DoctorsResponse, PublicDoctor } from "./schemas";

export const listDoctors = async (
  filters: DoctorFilters,
): Promise<DoctorsResponse> => {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.maxFee !== undefined)
    params.set("maxFee", String(filters.maxFee));
  if (filters.minRating !== undefined)
    params.set("minRating", String(filters.minRating));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", String(filters.page));
  filters.specializationId?.forEach((id) =>
    params.append("specializationId", String(id)),
  );

  const { data } = await apiClient().get<ApiSuccess<DoctorsResponse>>(
    `/doctors?${params.toString()}`,
  );
  return data.data;
};

export const getDoctor = async (id: string): Promise<PublicDoctor> => {
  const { data } = await apiClient().get<ApiSuccess<{ doctor: PublicDoctor }>>(
    `/doctors/${encodeURIComponent(id)}`,
  );
  return data.data.doctor;
};

export interface TimeSlot {
  start: string;
  end: string;
}

export const getDoctorSlots = async (
  id: string,
  date: string,
): Promise<TimeSlot[]> => {
  const { data } = await apiClient().get<ApiSuccess<{ slots: TimeSlot[] }>>(
    `/doctors/${encodeURIComponent(id)}/slots?date=${encodeURIComponent(date)}`,
  );
  return data.data.slots;
};
