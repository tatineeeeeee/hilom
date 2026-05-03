import { LinkButton } from "@/components/ui/link-button";
import { useAuth } from "@/features/auth/hooks";
import { useProfileComplete } from "../hooks";

export const ProfileCompletionBanner = () => {
  const { user } = useAuth();
  const { complete, loaded } = useProfileComplete();

  if (!user || user.role !== "doctor") return null;
  if (!loaded || complete) return null;

  return (
    <div
      role="status"
      className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          Complete your doctor profile so patients can find and book you.
        </p>
        <LinkButton to="/profile/setup" variant="outline" className="min-h-11">
          Complete profile
        </LinkButton>
      </div>
    </div>
  );
};
