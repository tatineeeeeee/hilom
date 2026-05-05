import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMyAppointments } from "@/features/appointments/hooks";
import { useMyPrescriptions } from "@/features/prescriptions/hooks";

const formatDay = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const NextAppointmentCard = () => {
  const { data } = useMyAppointments({ page: 1 });
  const next = data?.appointments.find(
    (a) => a.status === "pending" || a.status === "confirmed",
  );

  return (
    <Link to="/appointments" className="block rounded-xl focus:outline-none">
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-base">Upcoming appointment</CardTitle>
        </CardHeader>
        <CardContent>
          {next ? (
            <div className="text-sm">
              <p className="font-medium">{next.doctorName}</p>
              <p className="text-muted-foreground">
                {next.appointmentDate} · {next.slotStart}–{next.slotEnd}
              </p>
              <p className="mt-1 text-xs capitalize text-muted-foreground">
                {next.status}
                {next.paymentStatus && next.paymentStatus !== "pending"
                  ? ` · ${next.paymentStatus}`
                  : ""}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No upcoming appointments.{" "}
              <span className="text-primary">Find a doctor</span> to book.
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

const RecentPrescriptionsCard = () => {
  const { data } = useMyPrescriptions();
  const recent = data?.slice(0, 3) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent prescriptions</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Prescriptions land here after a completed appointment.
          </p>
        ) : (
          <ul className="grid gap-2">
            {recent.map((rx) => (
              <li key={rx.id}>
                <Link
                  to={`/appointments/${rx.appointmentId}/prescription`}
                  className="block rounded-md border p-2 text-sm hover:bg-muted"
                >
                  <p className="font-medium">{rx.otherPartyName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDay(rx.createdAt)} · {rx.medicationCount}{" "}
                    {rx.medicationCount === 1 ? "medication" : "medications"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

const QuickBookCard = () => (
  <Link to="/doctors" className="block rounded-xl focus:outline-none">
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-base">Quick book</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Browse doctors by specialization, rating, and fee.
        </p>
      </CardContent>
    </Card>
  </Link>
);

export const PatientDashboard = () => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <NextAppointmentCard />
    <RecentPrescriptionsCard />
    <QuickBookCard />
  </div>
);
