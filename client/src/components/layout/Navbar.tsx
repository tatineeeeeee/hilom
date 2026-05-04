import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { useAuth } from "@/features/auth/hooks";
import { useUnreadCount, useChatSocket } from "@/features/chat/hooks";
import { usePrescriptionSocket } from "@/features/prescriptions/hooks";
import { UnreadBadge } from "@/features/chat/components/UnreadBadge";
import { cn } from "@/lib/utils";

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  useChatSocket();
  usePrescriptionSocket();
  const { data: unread } = useUnreadCount();
  const unreadCount = isAuthenticated ? (unread ?? 0) : 0;

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate("/", { replace: true });
  };

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(
      "min-h-[44px] px-3 flex items-center text-sm font-medium",
      isActive ? "text-foreground" : "text-muted-foreground",
    );

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="text-xl font-bold tracking-tight">
          Hilom
        </Link>

        <nav className="hidden items-center gap-2 sm:flex">
          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard" className={linkClasses}>
                Dashboard
              </NavLink>
              {user?.role === "patient" && (
                <NavLink to="/appointments" className={linkClasses}>
                  Appointments
                </NavLink>
              )}
              {user?.role === "doctor" && (
                <NavLink to="/my-appointments" className={linkClasses}>
                  Appointments
                </NavLink>
              )}
              <NavLink to="/messages" className={linkClasses}>
                <span className="flex items-center gap-1.5">
                  Messages
                  <UnreadBadge count={unreadCount} />
                </span>
              </NavLink>
              <NavLink to="/prescriptions" className={linkClasses}>
                Prescriptions
              </NavLink>
              <span className="hidden text-sm text-muted-foreground md:inline">
                {user?.fullName}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClasses}>
                Log in
              </NavLink>
              <LinkButton to="/register" size="sm">
                Sign up
              </LinkButton>
            </>
          )}
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {open && (
        <nav id="mobile-nav" className="border-t bg-background sm:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {isAuthenticated ? (
              <>
                <NavLink
                  to="/dashboard"
                  className={linkClasses}
                  onClick={() => setOpen(false)}
                >
                  Dashboard
                </NavLink>
                {user?.role === "patient" && (
                  <NavLink
                    to="/appointments"
                    className={linkClasses}
                    onClick={() => setOpen(false)}
                  >
                    Appointments
                  </NavLink>
                )}
                {user?.role === "doctor" && (
                  <NavLink
                    to="/my-appointments"
                    className={linkClasses}
                    onClick={() => setOpen(false)}
                  >
                    Appointments
                  </NavLink>
                )}
                <NavLink
                  to="/messages"
                  className={linkClasses}
                  onClick={() => setOpen(false)}
                >
                  <span className="flex items-center gap-1.5">
                    Messages
                    <UnreadBadge count={unreadCount} />
                  </span>
                </NavLink>
                <NavLink
                  to="/prescriptions"
                  className={linkClasses}
                  onClick={() => setOpen(false)}
                >
                  Prescriptions
                </NavLink>
                <Button variant="outline" onClick={handleLogout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={linkClasses}
                  onClick={() => setOpen(false)}
                >
                  Log in
                </NavLink>
                <LinkButton to="/register" onClick={() => setOpen(false)}>
                  Sign up
                </LinkButton>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};
