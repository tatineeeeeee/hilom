import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";

const lazy1 = <T extends Record<string, unknown>, K extends keyof T>(
  importFn: () => Promise<T>,
  name: K,
) =>
  lazy(() =>
    importFn().then((m) => ({ default: m[name] as React.ComponentType })),
  );

const LoginPage = lazy1(
  () => import("@/features/auth/pages/LoginPage"),
  "LoginPage",
);
const RegisterPage = lazy1(
  () => import("@/features/auth/pages/RegisterPage"),
  "RegisterPage",
);
const ForgotPasswordPage = lazy1(
  () => import("@/features/auth/pages/ForgotPasswordPage"),
  "ForgotPasswordPage",
);
const ResetPasswordPage = lazy1(
  () => import("@/features/auth/pages/ResetPasswordPage"),
  "ResetPasswordPage",
);
const VerifyEmailPage = lazy1(
  () => import("@/features/auth/pages/VerifyEmailPage"),
  "VerifyEmailPage",
);
const HomePage = lazy1(() => import("@/pages/HomePage"), "HomePage");
const DashboardPage = lazy1(
  () => import("@/pages/DashboardPage"),
  "DashboardPage",
);
const NotFoundPage = lazy1(
  () => import("@/pages/NotFoundPage"),
  "NotFoundPage",
);
const ProfileSetupPage = lazy1(
  () => import("@/features/profile/pages/ProfileSetupPage"),
  "ProfileSetupPage",
);
const SchedulePage = lazy1(
  () => import("@/features/profile/pages/SchedulePage"),
  "SchedulePage",
);
const DoctorListPage = lazy1(
  () => import("@/features/doctors/pages/DoctorListPage"),
  "DoctorListPage",
);
const DoctorDetailPage = lazy1(
  () => import("@/features/doctors/pages/DoctorDetailPage"),
  "DoctorDetailPage",
);
const PatientAppointmentsPage = lazy1(
  () => import("@/features/appointments/pages/PatientAppointmentsPage"),
  "PatientAppointmentsPage",
);
const DoctorAppointmentsPage = lazy1(
  () => import("@/features/appointments/pages/DoctorAppointmentsPage"),
  "DoctorAppointmentsPage",
);
const ChatPage = lazy1(
  () => import("@/features/chat/pages/ChatPage"),
  "ChatPage",
);
const ConversationsPage = lazy1(
  () => import("@/features/chat/pages/ConversationsPage"),
  "ConversationsPage",
);
const WritePrescriptionPage = lazy1(
  () => import("@/features/prescriptions/pages/WritePrescriptionPage"),
  "WritePrescriptionPage",
);
const ViewPrescriptionPage = lazy1(
  () => import("@/features/prescriptions/pages/ViewPrescriptionPage"),
  "ViewPrescriptionPage",
);
const MyPrescriptionsPage = lazy1(
  () => import("@/features/prescriptions/pages/MyPrescriptionsPage"),
  "MyPrescriptionsPage",
);
const PaymentPage = lazy1(
  () => import("@/features/payments/pages/PaymentPage"),
  "PaymentPage",
);
const MyPaymentsPage = lazy1(
  () => import("@/features/payments/pages/MyPaymentsPage"),
  "MyPaymentsPage",
);
const AdminStatsPage = lazy1(
  () => import("@/features/admin/pages/AdminStatsPage"),
  "AdminStatsPage",
);
const UserManagementPage = lazy1(
  () => import("@/features/admin/pages/UserManagementPage"),
  "UserManagementPage",
);
const DoctorVerificationPage = lazy1(
  () => import("@/features/admin/pages/DoctorVerificationPage"),
  "DoctorVerificationPage",
);

const PageFallback = () => (
  <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
    <Skeleton className="h-8 w-48 rounded" />
    <Skeleton className="h-32 rounded-xl" />
    <Skeleton className="h-32 rounded-xl" />
    <Skeleton className="h-32 rounded-xl" />
  </div>
);

export const AppRoutes = () => {
  return (
    <Suspense fallback={<PageFallback />}>
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
            <Route
              path="/my-appointments"
              element={<DoctorAppointmentsPage />}
            />
            <Route path="/messages" element={<ConversationsPage />} />
            <Route path="/appointments/:id/chat" element={<ChatPage />} />
            <Route
              path="/appointments/:id/prescription/new"
              element={<WritePrescriptionPage />}
            />
            <Route
              path="/appointments/:id/prescription"
              element={<ViewPrescriptionPage />}
            />
            <Route path="/prescriptions" element={<MyPrescriptionsPage />} />
            <Route path="/payments/:appointmentId" element={<PaymentPage />} />
            <Route path="/payments" element={<MyPaymentsPage />} />

            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminStatsPage />} />
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route
                path="/admin/doctors"
                element={<DoctorVerificationPage />}
              />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};
