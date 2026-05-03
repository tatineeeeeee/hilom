import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks";
import { getMyProfile, type MyProfile } from "./api";

export const profileQueryKey = ["me", "profile"] as const;

export const useMyProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: getMyProfile,
    enabled: user !== null,
    staleTime: 30 * 1000,
  });
};

interface ProfileCompleteness {
  complete: boolean;
  missing: string[];
  loaded: boolean;
}

const isDoctorProfile = (
  profile: MyProfile["profile"],
): profile is Exclude<MyProfile["profile"], null> & {
  specializationId: number;
} => profile !== null && "specializationId" in profile;

export const useProfileComplete = (): ProfileCompleteness => {
  const { user } = useAuth();
  const { data, isPending } = useMyProfile();

  if (!user) {
    return { complete: false, missing: ["account"], loaded: false };
  }

  if (isPending || !data) {
    return { complete: false, missing: [], loaded: false };
  }

  if (user.role === "patient") {
    return { complete: true, missing: [], loaded: true };
  }

  if (user.role === "doctor") {
    if (isDoctorProfile(data.profile)) {
      return { complete: true, missing: [], loaded: true };
    }
    return {
      complete: false,
      missing: ["specialization", "bio", "consultation fee"],
      loaded: true,
    };
  }

  return { complete: true, missing: [], loaded: true };
};
