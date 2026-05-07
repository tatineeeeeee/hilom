import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { MobileBottomNav } from "./MobileBottomNav";
import { EmailVerificationBanner } from "@/features/auth/components/EmailVerificationBanner";
import { useAuth } from "@/features/auth/hooks";
import { cn } from "@/lib/utils";

export const AppLayout = () => {
  const { isAuthenticated, user } = useAuth();
  const hasBottomNav = isAuthenticated && user?.role !== "admin";

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <EmailVerificationBanner />
      <main className={cn("flex-1", hasBottomNav && "pb-16 sm:pb-0")}>
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
};
