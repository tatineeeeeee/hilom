import { NavLink } from "react-router-dom";
import {
  Calendar,
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks";
import { useUnreadCount } from "@/features/chat/hooks";

interface Tab {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: boolean;
}

const PATIENT_TABS: Tab[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { to: "/doctors", icon: Stethoscope, label: "Doctors" },
  { to: "/appointments", icon: Calendar, label: "Bookings" },
  { to: "/messages", icon: MessageSquare, label: "Messages", badge: true },
  { to: "/prescriptions", icon: FileText, label: "Rx" },
];

const DOCTOR_TABS: Tab[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { to: "/my-appointments", icon: Calendar, label: "Schedule" },
  { to: "/messages", icon: MessageSquare, label: "Messages", badge: true },
  { to: "/prescriptions", icon: FileText, label: "Rx" },
  { to: "/payments", icon: CreditCard, label: "Payments" },
];

export const MobileBottomNav = () => {
  const { user, isAuthenticated } = useAuth();
  const { data: unread } = useUnreadCount();
  const unreadCount = unread ?? 0;

  if (!isAuthenticated || user?.role === "admin") return null;

  const tabs = user?.role === "doctor" ? DOCTOR_TABS : PATIENT_TABS;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur sm:hidden"
      aria-label="Primary navigation"
    >
      <div className="flex h-16 items-stretch">
        {tabs.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            <div className="relative">
              <Icon className="size-5" aria-hidden />
              {badge && unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
