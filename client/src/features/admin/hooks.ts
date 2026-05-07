import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPlatformStats,
  listUnverifiedDoctors,
  listUsers,
  verifyDoctor,
} from "./api";

export const adminUsersKey = (params: {
  page?: number;
  role?: string;
  search?: string;
}) => ["admin-users", params] as const;

export const adminUnverifiedKey = (page: number) =>
  ["admin-unverified", page] as const;

export const adminStatsKey = ["admin-stats"] as const;

export const useAdminUsers = (params: {
  page?: number;
  role?: "patient" | "doctor" | "admin";
  search?: string;
}) =>
  useQuery({
    queryKey: adminUsersKey(params),
    queryFn: () => listUsers(params),
    staleTime: 30_000,
  });

export const useUnverifiedDoctors = (page = 1) =>
  useQuery({
    queryKey: adminUnverifiedKey(page),
    queryFn: () => listUnverifiedDoctors(page),
    staleTime: 30_000,
  });

export const useVerifyDoctor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      doctorProfileId,
      isVerified,
    }: {
      doctorProfileId: string;
      isVerified: boolean;
    }) => verifyDoctor(doctorProfileId, isVerified),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-unverified"] });
      void qc.invalidateQueries({ queryKey: adminStatsKey });
    },
  });
};

export const useAdminStats = () =>
  useQuery({
    queryKey: adminStatsKey,
    queryFn: getPlatformStats,
    staleTime: 30_000,
  });
