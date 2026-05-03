import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { ProfileSetupPage } from "@/features/profile/pages/ProfileSetupPage";
import { VerifyEmailPage } from "@/features/auth/pages/VerifyEmailPage";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/pages/ResetPasswordPage";
import { HomePage } from "@/pages/HomePage";
import { DashboardPage } from "@/pages/DashboardPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { DoctorListPage } from "@/features/doctors/pages/DoctorListPage";
import { DoctorDetailPage } from "@/features/doctors/pages/DoctorDetailPage";
import { SchedulePage } from "@/features/profile/pages/SchedulePage";
import { PatientAppointmentsPage } from "@/features/appointments/pages/PatientAppointmentsPage";
import { DoctorAppointmentsPage } from "@/features/appointments/pages/DoctorAppointmentsPage";

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile/setup" element={<ProfileSetupPage />} />
          <Route path="/doctors" element={<DoctorListPage />} />
          <Route path="/doctors/:id" element={<DoctorDetailPage />} />
          <Route path="/profile/schedule" element={<SchedulePage />} />
          <Route path="/appointments" element={<PatientAppointmentsPage />} />
          <Route path="/my-appointments" element={<DoctorAppointmentsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
