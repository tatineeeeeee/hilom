import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import { confirmPaymentMock, getPayment, listMyPayments } from "./api";

export const paymentByAppointmentKey = (appointmentId: string) =>
  ["payment", appointmentId] as const;

export const paymentListKey = ["payments"] as const;

export const usePaymentByAppointment = (appointmentId: string | undefined) =>
  useQuery({
    queryKey: appointmentId
      ? paymentByAppointmentKey(appointmentId)
      : ["payment", ""],
    queryFn: () => {
      if (!appointmentId) throw new Error("No appointment");
      return getPayment(appointmentId);
    },
    enabled: Boolean(appointmentId),
    retry: false,
  });

export const useConfirmPaymentMock = (appointmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => confirmPaymentMock(appointmentId),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: paymentByAppointmentKey(appointmentId),
      });
      void qc.invalidateQueries({ queryKey: paymentListKey });
      void qc.invalidateQueries({ queryKey: ["myAppointments"] });
      void qc.invalidateQueries({ queryKey: ["doctorAppointments"] });
    },
  });
};

export const useMyPayments = () => {
  const isAuthenticated = useAuthStore((s) => s.user !== null);
  return useQuery({
    queryKey: paymentListKey,
    queryFn: listMyPayments,
    staleTime: 30_000,
    enabled: isAuthenticated,
  });
};
