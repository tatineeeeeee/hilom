import { create } from "zustand";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  initializing: boolean;
  setSession: (params: { user: User; accessToken: string }) => void;
  setAccessToken: (token: string | null) => void;
  setInitializing: (value: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  initializing: true,
  setSession: ({ user, accessToken }) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setInitializing: (initializing) => set({ initializing }),
  clear: () => set({ user: null, accessToken: null }),
}));

export const getAccessTokenSnapshot = (): string | null =>
  useAuthStore.getState().accessToken;
