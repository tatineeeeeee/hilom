import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, type RenderHookOptions } from "@testing-library/react";
import { setApiClient, createApiClient } from "@/lib/api/client";

interface RenderHookWrapperOptions {
  accessToken?: string | null;
}

export const buildQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

export const installTestApiClient = (
  accessToken: string | null = "tok",
): void => {
  const client = createApiClient({
    getAccessToken: () => accessToken,
    refreshAccessToken: async () => null,
    onAuthFailure: () => undefined,
  });
  setApiClient(client);
};

export const renderHookWithProviders = <Result, Props>(
  hook: (props: Props) => Result,
  options?: RenderHookOptions<Props> & RenderHookWrapperOptions,
) => {
  installTestApiClient(options?.accessToken ?? "tok");
  const queryClient = buildQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(hook, { wrapper, ...options });
};
