import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/lib/api/types";
import type {
  Prescription,
  PrescriptionListItem,
  WritePrescriptionInput,
} from "./schemas";

export const writePrescription = async (
  appointmentId: string,
  body: WritePrescriptionInput,
): Promise<Prescription> => {
  const { data } = await apiClient().post<
    ApiSuccess<{ prescription: Prescription }>
  >(`/appointments/${encodeURIComponent(appointmentId)}/prescription`, body);
  return data.data.prescription;
};

export const getPrescription = async (
  appointmentId: string,
): Promise<Prescription> => {
  const { data } = await apiClient().get<
    ApiSuccess<{ prescription: Prescription }>
  >(`/appointments/${encodeURIComponent(appointmentId)}/prescription`);
  return data.data.prescription;
};

export const listMyPrescriptions = async (): Promise<
  PrescriptionListItem[]
> => {
  const { data } =
    await apiClient().get<
      ApiSuccess<{ prescriptions: PrescriptionListItem[] }>
    >("/prescriptions");
  return data.data.prescriptions;
};
