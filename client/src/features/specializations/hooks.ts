import { useQuery } from "@tanstack/react-query";
import { listSpecializations } from "./api";

export const specializationsQueryKey = ["specializations"] as const;

export const useSpecializations = () =>
  useQuery({
    queryKey: specializationsQueryKey,
    queryFn: listSpecializations,
    staleTime: 10 * 60_000,
  });
