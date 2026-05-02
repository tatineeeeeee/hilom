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
  const { data } =
    await apiClient().post<ApiSuccess<AuthResponse>>("/auth/refresh");
  return data.data;
};

export const logoutUser = async (): Promise<void> => {
  await apiClient().post("/auth/logout");
};

export const getMe = async (): Promise<User> => {
  const { data } =
    await apiClient().get<ApiSuccess<{ user: User }>>("/auth/me");
  return data.data.user;
};

export const listSpecializations = async (): Promise<Specialization[]> => {
  const { data } =
    await apiClient().get<ApiSuccess<Specialization[]>>("/specializations");
  return data.data;
};

export const verifyEmail = async (token: string): Promise<void> => {
  await apiClient().get<ApiSuccess<{ verified: true }>>(
    `/auth/verify-email?token=${encodeURIComponent(token)}`,
  );
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  await apiClient().post<ApiSuccess<{ sent: true }>>("/auth/forgot-password", {
    email,
  });
};

export const resetPassword = async (
  token: string,
  newPassword: string,
): Promise<void> => {
  await apiClient().post<ApiSuccess<{ reset: true }>>("/auth/reset-password", {
    token,
    newPassword,
  });
};

export const resendVerification = async (): Promise<void> => {
  await apiClient().post("/auth/resend-verification");
};
