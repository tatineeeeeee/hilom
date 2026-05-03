import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bookAppointment,
  cancelAppointment,
  listDoctorAppointments,
  listMyAppointments,
  submitReview,
  updateAppointmentStatus,
} from "./api";

export const myAppointmentsKey = (params: { status?: string; page?: number }) =>
  ["myAppointments", params] as const;

export const doctorAppointmentsKey = (params: {
  status?: string;
  page?: number;
}) => ["doctorAppointments", params] as const;

export const useMyAppointments = (params: { status?: string; page?: number }) =>
  useQuery({
    queryKey: myAppointmentsKey(params),
    queryFn: () => listMyAppointments(params),
    staleTime: 30_000,
  });

export const useDoctorAppointments = (params: {
  status?: string;
  page?: number;
}) =>
  useQuery({
    queryKey: doctorAppointmentsKey(params),
    queryFn: () => listDoctorAppointments(params),
    staleTime: 30_000,
  });

export const useBookAppointment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bookAppointment,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["myAppointments"] });
    },
  });
};

export const useCancelAppointment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["myAppointments"] });
    },
  });
};

export const useUpdateAppointmentStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateAppointmentStatus(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["doctorAppointments"] });
    },
  });
};

export const useSubmitReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      appointmentId,
      input,
    }: {
      appointmentId: string;
      input: { rating: number; comment?: string };
    }) => submitReview(appointmentId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["myAppointments"] });
    },
  });
};
