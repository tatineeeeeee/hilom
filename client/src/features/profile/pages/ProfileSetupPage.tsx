import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks";
import { PatientProfileForm } from "../components/PatientProfileForm";
import { DoctorProfileForm } from "../components/DoctorProfileForm";
import { useMyProfile } from "../hooks";
import { isDoctorProfile, isPatientProfile } from "../schemas";

export const ProfileSetupPage = () => {
  const { user } = useAuth();
  const profileQuery = useMyProfile();

  if (!user) return null;

  const profile = profileQuery.data?.profile ?? null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>
            {user.role === "doctor"
              ? "Complete your doctor profile"
              : "Complete your patient profile"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profileQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Loading profile…</p>
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
        </CardContent>
      </Card>
    </div>
  );
};
