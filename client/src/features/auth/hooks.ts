import { useCallback, useEffect } from "react";
import { useAuthStore } from "./store";
import {
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
} from "./api";
import type { LoginInput } from "./schemas";
import type { RegisterDoctorInput, RegisterPatientInput } from "./schemas";

type RegisterPayload = RegisterPatientInput | RegisterDoctorInput;

export const useAuth = () => {
  const user = useAuthStore((s) => s.user);
  const initializing = useAuthStore((s) => s.initializing);
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);

  const login = useCallback(
    async (input: LoginInput) => {
      const session = await loginUser(input);
      setSession(session);
      return session.user;
    },
    [setSession],
  );

  const register = useCallback(
    async (input: RegisterPayload) => {
      const session = await registerUser(input);
      setSession(session);
      return session.user;
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      clear();
    }
  }, [clear]);

  return {
    user,
    initializing,
    isAuthenticated: user !== null,
    login,
    register,
    logout,
  };
};

export const useBootstrapAuth = (): void => {
  const setSession = useAuthStore((s) => s.setSession);
  const setInitializing = useAuthStore((s) => s.setInitializing);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const session = await refreshSession();
        if (!cancelled) setSession(session);
      } catch {
        if (!cancelled) clear();
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [setSession, setInitializing, clear]);
};
