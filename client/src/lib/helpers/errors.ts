import type { AxiosError } from "axios";
import type { ApiError } from "../api/types";

const isApiError = (value: unknown): value is ApiError => {
  if (typeof value !== "object" || value === null) return false;
  if (!("success" in value) || !("error" in value)) return false;
  return value.success === false && typeof value.error === "string";
};

export const extractApiError = (err: unknown): ApiError => {
  if (isAxiosLikeError(err)) {
    const data = err.response?.data;
    if (isApiError(data)) return data;
  }
  if (err instanceof Error) {
    return { success: false, error: err.message };
  }
  return { success: false, error: "Unknown error" };
};

const isAxiosLikeError = (
  err: unknown,
): err is AxiosError<unknown> => {
  if (typeof err !== "object" || err === null) return false;
  return "isAxiosError" in err && err.isAxiosError === true;
};

export const fieldErrors = (
  err: ApiError,
): Record<string, string[]> => err.details?.fieldErrors ?? {};

export const firstFieldError = (
  err: ApiError,
  field: string,
): string | undefined => fieldErrors(err)[field]?.[0];
