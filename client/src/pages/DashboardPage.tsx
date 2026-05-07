import { useAuth } from "@/features/auth/hooks";
import { ProfileCompletionBanner } from "@/features/profile/components/ProfileCompletionBanner";
import { PatientDashboard } from "./dashboard/PatientDashboard";
import { DoctorDashboard } from "./dashboard/DoctorDashboard";
import { AdminDashboard } from "./dashboard/AdminDashboard";

export const DashboardPage = () => {
  const { user } = useAuth();
  if (!user) return null;

  const greeting = `Welcome, ${user.fullName.split(" ")[0]}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting}
        </h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium">{user.role}</span> —{" "}
          {user.email}
        </p>
      </header>
      <ProfileCompletionBanner />
      {user.role === "patient" && <PatientDashboard />}
      {user.role === "doctor" && <DoctorDashboard />}
      {user.role === "admin" && <AdminDashboard />}
    </div>
  );
};
