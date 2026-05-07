import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const links = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/doctors", label: "Doctor verification" },
];

export const AdminSidebar = () => (
  <nav className="flex gap-1 overflow-x-auto border-b sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r sm:pr-4">
    {links.map((link) => (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.end}
        className={({ isActive }) =>
          cn(
            "min-h-[44px] whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )
        }
      >
        {link.label}
      </NavLink>
    ))}
  </nav>
);
