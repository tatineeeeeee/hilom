import { createApiClient, setApiClient } from "@/lib/api/client";
import { refreshSession } from "@/features/auth/api";
import { getAccessTokenSnapshot, useAuthStore } from "@/features/auth/store";

let initialized = false;

export const initApiClient = (): void => {
  if (initialized) return;
  initialized = true;

  const client = createApiClient({
    getAccessToken: getAccessTokenSnapshot,
    refreshAccessToken: async () => {
      try {
        const session = await refreshSession();
        useAuthStore
          .getState()
          .setSession({ user: session.user, accessToken: session.accessToken });
        return session.accessToken;
      } catch {
        useAuthStore.getState().clear();
        return null;
      }
    },
    onAuthFailure: () => {
      useAuthStore.getState().clear();
    },
  });

  setApiClient(client);
};
