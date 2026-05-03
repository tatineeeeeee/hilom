import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks";
import { ProfileCompletionBanner } from "@/features/profile/components/ProfileCompletionBanner";

export const DashboardPage = () => {
  const { user } = useAuth();
  if (!user) return null;

  const greeting = `Welcome, ${user.fullName.split(" ")[0]}`;
  const placeholders = roleSections[user.role];

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {placeholders.map((p) => {
          const inner = (
            <Card className={p.href ? "transition-shadow hover:shadow-md" : ""}>
              <CardHeader>
                <CardTitle className="text-base">{p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{p.body}</p>
              </CardContent>
            </Card>
          );
          return p.href ? (
            <Link
              key={p.title}
              to={p.href}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            >
              {inner}
            </Link>
          ) : (
            <div key={p.title}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
};

interface Section {
  title: string;
  body: string;
  href?: string | null;
}

const roleSections: Record<"patient" | "doctor" | "admin", Section[]> = {
  patient: [
    {
      title: "Upcoming appointments",
      body: "You have no upcoming appointments yet. Browse doctors to book your first slot.",
    },
    {
      title: "Recent prescriptions",
      body: "Prescriptions land here after a completed appointment.",
    },
    {
      title: "Find a doctor",
      body: "Browse doctors by specialization, rating, and fee.",
      href: "/doctors",
    },
  ],
  doctor: [
    {
      title: "Today's schedule",
      body: "No confirmed appointments today.",
    },
    {
      title: "Pending confirmations",
      body: "Patient bookings waiting on your confirmation will show up here.",
    },
    {
      title: "Manage schedule",
      body: "Set your available hours for each day of the week.",
      href: "/profile/schedule",
    },
  ],
  admin: [
    {
      title: "Users",
      body: "Total users, by role.",
    },
    {
      title: "Unverified doctors",
      body: "Verify or reject pending doctor profiles.",
    },
    {
      title: "Platform health",
      body: "Appointment volume and revenue.",
    },
  ],
};
