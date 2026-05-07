import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar";

export const AdminLayout = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && user.role !== "admin")
    return <Navigate to="/dashboard" replace />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl">
        Admin
      </h1>
      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <AdminSidebar />
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
