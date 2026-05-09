import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/lib/api/types";
import type { Payment, PaymentsResponse } from "./schemas";

export const getPayment = async (appointmentId: string): Promise<Payment> => {
  const { data } = await apiClient().get<ApiSuccess<{ payment: Payment }>>(
    `/appointments/${encodeURIComponent(appointmentId)}/payment`,
  );
  return data.data.payment;
};

export const confirmPaymentMock = async (
  appointmentId: string,
): Promise<Payment> => {
  const { data } = await apiClient().post<ApiSuccess<{ payment: Payment }>>(
    `/appointments/${encodeURIComponent(appointmentId)}/payment/confirm`,
  );
  return data.data.payment;
};

export const listMyPayments = async (
  params: {
    page?: number;
  } = {},
): Promise<PaymentsResponse> => {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  const qs = search.toString();
  const { data } = await apiClient().get<ApiSuccess<PaymentsResponse>>(
    `/payments${qs ? `?${qs}` : ""}`,
  );
  return data.data;
};
