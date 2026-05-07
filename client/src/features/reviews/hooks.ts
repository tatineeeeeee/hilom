import { useQuery } from "@tanstack/react-query";
import { listDoctorReviews } from "./api";

export const doctorReviewsKey = (doctorId: string, page: number) =>
  ["doctor-reviews", doctorId, page] as const;

export const useDoctorReviews = (doctorId: string | undefined, page = 1) =>
  useQuery({
    queryKey: doctorReviewsKey(doctorId ?? "", page),
    queryFn: () => {
      if (!doctorId) throw new Error("No doctor id");
      return listDoctorReviews(doctorId, page);
    },
    enabled: Boolean(doctorId),
    staleTime: 30_000,
  });
