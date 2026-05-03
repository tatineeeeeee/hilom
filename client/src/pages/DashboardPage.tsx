import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks";
import { ProfileCompletionBanner } from "@/features/profile/components/ProfileCompletionBanner";
import {
  useMyAppointments,
  useDoctorAppointments,
} from "@/features/appointments/hooks";

const NextAppointmentCard = () => {
  const { data } = useMyAppointments({ page: 1 });
  const next = data?.appointments.find(
    (a) => a.status === "pending" || a.status === "confirmed",
  );

  return (
    <Link
      to="/appointments"
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-base">Upcoming appointment</CardTitle>
        </CardHeader>
        <CardContent>
          {next ? (
            <div className="text-sm">
              <p className="font-medium">{next.doctorName}</p>
              <p className="text-muted-foreground">
                {next.appointmentDate} &middot; {next.slotStart}–{next.slotEnd}
              </p>
              <p className="mt-1 text-xs text-muted-foreground capitalize">
                {next.status}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No upcoming appointments. Browse doctors to book your first slot.
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

const DoctorAppointmentsCard = () => {
  const { data } = useDoctorAppointments({ status: "pending", page: 1 });
  const pendingCount = data?.total ?? 0;

  return (
    <Link
      to="/my-appointments"
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-base">
            Pending confirmations
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {pendingCount}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {pendingCount > 0
              ? `${pendingCount} booking${pendingCount > 1 ? "s" : ""} waiting on your confirmation.`
              : "No pending bookings right now."}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
};

export const DashboardPage = () => {
  const { user } = useAuth();
  if (!user) return null;

  const greeting = `Welcome, ${user.fullName.split(" ")[0]}`;

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
        {user.role === "patient" && (
          <>
            <NextAppointmentCard />
            <PlaceholderCard
              title="Recent prescriptions"
              body="Prescriptions land here after a completed appointment."
            />
            <LinkCard
              title="Find a doctor"
              body="Browse doctors by specialization, rating, and fee."
              href="/doctors"
            />
          </>
        )}
        {user.role === "doctor" && (
          <>
            <DoctorAppointmentsCard />
            <LinkCard
              title="All appointments"
              body="View and manage all your patient appointments."
              href="/my-appointments"
            />
            <LinkCard
              title="Manage schedule"
              body="Set your available hours for each day of the week."
              href="/profile/schedule"
            />
          </>
        )}
        {user.role === "admin" && (
          <>
            <PlaceholderCard title="Users" body="Total users, by role." />
            <PlaceholderCard
              title="Unverified doctors"
              body="Verify or reject pending doctor profiles."
            />
            <PlaceholderCard
              title="Platform health"
              body="Appointment volume and revenue."
            />
          </>
        )}
      </div>
    </div>
  );
};

const PlaceholderCard = ({ title, body }: { title: string; body: string }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">{body}</p>
    </CardContent>
  </Card>
);

const LinkCard = ({
  title,
  body,
  href,
}: {
  title: string;
  body: string;
  href: string;
}) => (
  <Link
    to={href}
    className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
  >
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  </Link>
);
