import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { EmailVerificationBanner } from "@/features/auth/components/EmailVerificationBanner";

export const AppLayout = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <EmailVerificationBanner />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};
