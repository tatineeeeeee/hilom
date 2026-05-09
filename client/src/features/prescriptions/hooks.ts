import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import { getSocket } from "@/lib/socket";
import { getPrescription, listMyPrescriptions, writePrescription } from "./api";
import type { WritePrescriptionInput } from "./schemas";

export const prescriptionByAppointmentKey = (appointmentId: string) =>
  ["prescription", appointmentId] as const;

export const prescriptionListKey = (page = 1) =>
  ["prescriptions", page] as const;

export const usePrescriptionByAppointment = (
  appointmentId: string | undefined,
) =>
  useQuery({
    queryKey: appointmentId
      ? prescriptionByAppointmentKey(appointmentId)
      : ["prescription", ""],
    queryFn: () => {
      if (!appointmentId) throw new Error("No appointment");
      return getPrescription(appointmentId);
    },
    enabled: Boolean(appointmentId),
    retry: false,
  });

export const useWritePrescription = (appointmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WritePrescriptionInput) =>
      writePrescription(appointmentId, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: prescriptionByAppointmentKey(appointmentId),
      });
      void qc.invalidateQueries({ queryKey: ["prescriptions"] });
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      void qc.invalidateQueries({ queryKey: ["doctor-appointments"] });
    },
  });
};

export const useMyPrescriptions = (page = 1) => {
  const isAuthenticated = useAuthStore((s) => s.user !== null);
  return useQuery({
    queryKey: prescriptionListKey(page),
    queryFn: () => listMyPrescriptions({ page }),
    staleTime: 30_000,
    enabled: isAuthenticated,
  });
};

interface PrescriptionNewPayload {
  appointmentId: string;
  prescriptionId: string;
}

const isPrescriptionNew = (v: unknown): v is PrescriptionNewPayload => {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.appointmentId === "string" &&
    typeof obj.prescriptionId === "string"
  );
};

export const usePrescriptionSocket = (): void => {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    const handle = (payload: unknown) => {
      if (!isPrescriptionNew(payload)) return;
      void qc.invalidateQueries({ queryKey: ["prescriptions"] });
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      void qc.invalidateQueries({
        queryKey: prescriptionByAppointmentKey(payload.appointmentId),
      });
    };

    socket.on("prescription:new", handle);
    return () => {
      socket.off("prescription:new", handle);
    };
  }, [token, qc]);
};
