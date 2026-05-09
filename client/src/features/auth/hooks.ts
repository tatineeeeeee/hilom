import { useCallback, useEffect } from "react";
import type { User } from "@/types";
import { useAuthStore } from "./store";
import { loginUser, logoutUser, refreshSession, registerUser } from "./api";
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

// Module-level dedup so React Strict Mode's double-invocation of useEffect
// does not send two /auth/refresh requests with the same cookie, which would
// trigger the refresh-rotation reuse-detection and clear the session.
let ongoingBootstrap: Promise<{
  accessToken: string;
  user: User;
} | null> | null = null;

export const useBootstrapAuth = (): void => {
  const setSession = useAuthStore((s) => s.setSession);
  const setInitializing = useAuthStore((s) => s.setInitializing);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!ongoingBootstrap) {
        ongoingBootstrap = refreshSession()
          .catch(() => null)
          .finally(() => {
            ongoingBootstrap = null;
          });
      }
      const session = await ongoingBootstrap;
      if (!active) return;
      if (session) {
        setSession(session);
      } else {
        clear();
      }
      setInitializing(false);
    };

    void run();
    return () => {
      active = false;
    };
  }, [setSession, setInitializing, clear]);
};
