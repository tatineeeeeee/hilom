import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import { confirmPaymentMock, getPayment, listMyPayments } from "./api";

export const paymentByAppointmentKey = (appointmentId: string) =>
  ["payment", appointmentId] as const;

export const paymentListKey = (page = 1) => ["payments", page] as const;

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
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: ["myAppointments"] });
      void qc.invalidateQueries({ queryKey: ["doctorAppointments"] });
      void qc.invalidateQueries({ queryKey: ["doctor-stats"] });
    },
  });
};

export const useMyPayments = (page = 1) => {
  const isAuthenticated = useAuthStore((s) => s.user !== null);
  return useQuery({
    queryKey: paymentListKey(page),
    queryFn: () => listMyPayments({ page }),
    staleTime: 30_000,
    enabled: isAuthenticated,
  });
};
