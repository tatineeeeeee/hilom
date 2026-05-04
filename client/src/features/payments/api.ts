import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/lib/api/types";
import type { Payment, PaymentListItem } from "./schemas";

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

export const listMyPayments = async (): Promise<PaymentListItem[]> => {
  const { data } =
    await apiClient().get<ApiSuccess<{ payments: PaymentListItem[] }>>(
      "/payments",
    );
  return data.data.payments;
};
