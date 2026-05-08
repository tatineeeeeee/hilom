import { useAuthStore } from "@/features/auth/store";
import { GreetingHeader } from "@/features/dashboard/components/GreetingHeader";
import { UpcomingHero } from "@/features/dashboard/components/UpcomingHero";
import { ActionTiles } from "@/features/dashboard/components/ActionTiles";
import { RecentDoctorsRow } from "@/features/dashboard/components/RecentDoctorsRow";
import { SpecialtyGrid } from "@/features/dashboard/components/SpecialtyGrid";

export const PatientDashboard = () => {
  const fullName = useAuthStore((s) => s.user?.fullName ?? "");

  return (
    <div className="space-y-6">
      <GreetingHeader variant="patient" fullName={fullName} />
      <UpcomingHero />
      <ActionTiles />
      <RecentDoctorsRow />
      <SpecialtyGrid />
    </div>
  );
};
