import { apiClient } from "@/lib/api/client";
import type { ApiSuccess } from "@/lib/api/types";
import type { Specialization, User } from "@/types";
import type {
  LoginInput,
  RegisterDoctorInput,
  RegisterPatientInput,
} from "./schemas";

export interface AuthResponse {
  accessToken: string;
  user: User;
}

type RegisterPayload = RegisterPatientInput | RegisterDoctorInput;

export const registerUser = async (
  input: RegisterPayload,
): Promise<AuthResponse> => {
  const { data } = await apiClient().post<ApiSuccess<AuthResponse>>(
    "/auth/register",
    input,
  );
  return data.data;
};

export const loginUser = async (input: LoginInput): Promise<AuthResponse> => {
  const { data } = await apiClient().post<ApiSuccess<AuthResponse>>(
    "/auth/login",
    input,
  );
  return data.data;
};

export const refreshSession = async (): Promise<AuthResponse> => {
  const { data } = await apiClient().post<ApiSuccess<AuthResponse>>(
    "/auth/refresh",
  );
  return data.data;
};

export const logoutUser = async (): Promise<void> => {
  await apiClient().post("/auth/logout");
};

export const getMe = async (): Promise<User> => {
  const { data } = await apiClient().get<ApiSuccess<{ user: User }>>(
    "/auth/me",
  );
  return data.data.user;
};

export const listSpecializations = async (): Promise<Specialization[]> => {
  const { data } = await apiClient().get<ApiSuccess<Specialization[]>>(
    "/specializations",
  );
  return data.data;
};
