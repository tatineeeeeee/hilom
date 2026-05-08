import { useAuth } from "@/features/auth/hooks";
import { ProfileCompletionBanner } from "@/features/profile/components/ProfileCompletionBanner";
import { PatientDashboard } from "./dashboard/PatientDashboard";
import { DoctorDashboard } from "./dashboard/DoctorDashboard";
import { AdminDashboard } from "./dashboard/AdminDashboard";

export const DashboardPage = () => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ProfileCompletionBanner />
      {user.role === "patient" && <PatientDashboard />}
      {user.role === "doctor" && <DoctorDashboard />}
      {user.role === "admin" && <AdminDashboard />}
    </div>
  );
};
