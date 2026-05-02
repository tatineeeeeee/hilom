import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

type TokenGetter = () => string | null;
type RefreshFn = () => Promise<string | null>;
type LogoutFn = () => void;

interface RetryConfig extends InternalAxiosRequestConfig {
  __isRetry?: boolean;
}

interface ClientHooks {
  getAccessToken: TokenGetter;
  refreshAccessToken: RefreshFn;
  onAuthFailure: LogoutFn;
}

const baseURL = import.meta.env.VITE_API_URL ?? "/api";

let inflightRefresh: Promise<string | null> | null = null;

export const createApiClient = (hooks: ClientHooks): AxiosInstance => {
  const client = axios.create({
    baseURL,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use((config) => {
    config.headers.set("X-Request-Id", crypto.randomUUID());
    return config;
  });

  client.interceptors.request.use((config) => {
    const token = hooks.getAccessToken();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as RetryConfig | undefined;
      const status = error.response?.status;

      const isAuthEndpoint =
        typeof original?.url === "string" &&
        (original.url.endsWith("/auth/refresh") ||
          original.url.endsWith("/auth/login") ||
          original.url.endsWith("/auth/register"));

      if (status !== 401 || !original || original.__isRetry || isAuthEndpoint) {
        return Promise.reject(error);
      }

      original.__isRetry = true;

      try {
        inflightRefresh ??= hooks.refreshAccessToken().finally(() => {
          inflightRefresh = null;
        });
        const newToken = await inflightRefresh;
        if (!newToken) {
          hooks.onAuthFailure();
          return Promise.reject(error);
        }
        original.headers.set("Authorization", `Bearer ${newToken}`);
        return client.request(original);
      } catch (refreshErr) {
        hooks.onAuthFailure();
        return Promise.reject(refreshErr);
      }
    },
  );

  return client;
};

let clientInstance: AxiosInstance | null = null;

export const setApiClient = (client: AxiosInstance): void => {
  clientInstance = client;
};

export const apiClient = (): AxiosInstance => {
  if (!clientInstance) {
    throw new Error("API client not initialized. Call setApiClient first.");
  }
  return clientInstance;
};
