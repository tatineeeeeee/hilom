import { useQuery } from "@tanstack/react-query";
import { listDoctors, getDoctor, getDoctorSlots } from "./api";
import type { DoctorFilters } from "./schemas";

export const doctorsQueryKey = (filters: DoctorFilters) =>
  ["doctors", filters] as const;

export const doctorQueryKey = (id: string) => ["doctors", id] as const;

export const useDoctors = (filters: DoctorFilters) =>
  useQuery({
    queryKey: doctorsQueryKey(filters),
    queryFn: () => listDoctors(filters),
    staleTime: 2 * 60_000,
  });

export const useDoctor = (id: string) =>
  useQuery({
    queryKey: doctorQueryKey(id),
    queryFn: () => getDoctor(id),
    staleTime: 2 * 60_000,
    enabled: id.length > 0,
  });

export const doctorSlotsQueryKey = (id: string, date: string) =>
  ["doctors", id, "slots", date] as const;

export const useDoctorSlots = (id: string, date: string) =>
  useQuery({
    queryKey: doctorSlotsQueryKey(id, date),
    queryFn: () => getDoctorSlots(id, date),
    staleTime: 0,
    enabled: id.length > 0 && date.length > 0,
  });
