import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/lib/api/types";
import type {
  AppointmentsResponse,
  BookInput,
  BookingResult,
  DoctorAppointmentsResponse,
  ReviewInput,
} from "./schemas";

export const bookAppointment = async (
  input: BookInput,
): Promise<BookingResult> => {
  const { data } = await apiClient().post<ApiSuccess<BookingResult>>(
    "/appointments",
    input,
  );
  return data.data;
};

export const listMyAppointments = async (params: {
  status?: string;
  page?: number;
}): Promise<AppointmentsResponse> => {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.page) searchParams.set("page", String(params.page));
  const { data } = await apiClient().get<ApiSuccess<AppointmentsResponse>>(
    `/appointments?${searchParams.toString()}`,
  );
  return data.data;
};

export const cancelAppointment = async (id: string): Promise<unknown> => {
  const { data } = await apiClient().patch<ApiSuccess<unknown>>(
    `/appointments/${encodeURIComponent(id)}/status`,
    { status: "cancelled" },
  );
  return data.data;
};

export const listDoctorAppointments = async (params: {
  status?: string;
  page?: number;
}): Promise<DoctorAppointmentsResponse> => {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.page) searchParams.set("page", String(params.page));
  const { data } = await apiClient().get<
    ApiSuccess<DoctorAppointmentsResponse>
  >(`/me/doctor-appointments?${searchParams.toString()}`);
  return data.data;
};

export const updateAppointmentStatus = async (
  id: string,
  status: string,
): Promise<unknown> => {
  const { data } = await apiClient().patch<ApiSuccess<unknown>>(
    `/appointments/${encodeURIComponent(id)}/status`,
    { status },
  );
  return data.data;
};

export const submitReview = async (
  appointmentId: string,
  input: ReviewInput,
): Promise<unknown> => {
  const { data } = await apiClient().post<ApiSuccess<unknown>>(
    `/appointments/${encodeURIComponent(appointmentId)}/review`,
    input,
  );
  return data.data;
};
