import { UserCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/hooks";
import { PatientProfileForm } from "../components/PatientProfileForm";
import { DoctorProfileForm } from "../components/DoctorProfileForm";
import { useMyProfile } from "../hooks";
import { isDoctorProfile, isPatientProfile } from "../schemas";

const roleSubtitle: Record<string, string> = {
  doctor: "Help patients find and trust you by completing your profile.",
  patient: "Complete your profile so doctors can provide better care.",
};

export const ProfileSetupPage = () => {
  const { user } = useAuth();
  const profileQuery = useMyProfile();

  if (!user) return null;

  const profile = profileQuery.data?.profile ?? null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <UserCircle className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {user.role === "doctor"
              ? "Complete your doctor profile"
              : "Complete your patient profile"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {roleSubtitle[user.role] ?? ""}
          </p>
        </div>
      </div>

      {profileQuery.isPending ? (
        <div className="grid gap-4">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ) : profileQuery.isError ? (
        <p className="text-sm text-destructive">
          Could not load your profile. Try refreshing the page.
        </p>
      ) : user.role === "patient" ? (
        <PatientProfileForm
          initial={isPatientProfile(profile) ? profile : null}
        />
      ) : user.role === "doctor" ? (
        <DoctorProfileForm
          initial={isDoctorProfile(profile) ? profile : null}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Admins do not have a profile to complete.
        </p>
      )}
    </div>
  );
};
