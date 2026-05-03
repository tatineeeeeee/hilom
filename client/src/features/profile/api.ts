import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/lib/api/types";
import type { User } from "@/types";
import type {
  DoctorProfile,
  DoctorProfileInput,
  PatientProfile,
  PatientProfileInput,
} from "./schemas";

export interface MyProfilePatient {
  user: User;
  profile: PatientProfile | null;
}

export interface MyProfileDoctor {
  user: User;
  profile: DoctorProfile | null;
}

export type MyProfile = MyProfilePatient | MyProfileDoctor;

export const getMyProfile = async (): Promise<MyProfile> => {
  const { data } = await apiClient().get<ApiSuccess<MyProfile>>("/me/profile");
  return data.data;
};

export const updatePatientProfile = async (
  input: PatientProfileInput,
): Promise<{ profile: PatientProfile | null }> => {
  const { data } = await apiClient().put<
    ApiSuccess<{ profile: PatientProfile | null }>
  >("/me/profile", input);
  return data.data;
};

export const updateDoctorProfile = async (
  input: DoctorProfileInput,
): Promise<{ profile: DoctorProfile | null }> => {
  const { data } = await apiClient().put<
    ApiSuccess<{ profile: DoctorProfile | null }>
  >("/me/profile", input);
  return data.data;
};

export interface ScheduleRow {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export const getMySchedule = async (): Promise<ScheduleRow[]> => {
  const { data } =
    await apiClient().get<ApiSuccess<{ schedule: ScheduleRow[] }>>(
      "/me/schedule",
    );
  return data.data.schedule;
};

export interface ScheduleInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export const updateMySchedule = async (
  entries: ScheduleInput[],
): Promise<ScheduleRow[]> => {
  const { data } = await apiClient().put<
    ApiSuccess<{ schedule: ScheduleRow[] }>
  >("/me/schedule", entries);
  return data.data.schedule;
};
