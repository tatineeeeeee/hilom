export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  details?: { fieldErrors?: Record<string, string[]> };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
