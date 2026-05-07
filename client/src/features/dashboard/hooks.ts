import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import { getDoctorStats } from "./api";

export const doctorStatsKey = ["doctor-stats"] as const;

export const useDoctorStats = () => {
  const role = useAuthStore((s) => s.user?.role);
  return useQuery({
    queryKey: doctorStatsKey,
    queryFn: getDoctorStats,
    staleTime: 30_000,
    enabled: role === "doctor",
  });
};
