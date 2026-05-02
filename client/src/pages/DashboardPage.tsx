import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks";

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {placeholders.map((p) => (
          <Card key={p.title}>
            <CardHeader>
              <CardTitle className="text-base">{p.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{p.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

interface Section {
  title: string;
  body: string;
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
      title: "Quick book",
      body: "Find a doctor by specialization (Phase 3).",
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
      title: "Earnings & rating",
      body: "Earnings and rating populate after your first completed consult.",
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
