import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPHP } from "@/lib/utils/formatCurrency";
import { useDoctorStats } from "@/features/dashboard/hooks";
import { StatTile } from "@/features/dashboard/components/StatTile";
import { AppointmentRow } from "@/features/dashboard/components/AppointmentRow";

export const DoctorDashboard = () => {
  const { data, isPending, isError } = useDoctorStats();

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (isError || !data) {
    return <p className="text-sm text-destructive">Could not load stats.</p>;
  }

  const ratingDisplay = data.rating.average
    ? Number(data.rating.average).toFixed(1)
    : "—";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card className="sm:col-span-2 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Today's schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {data.todaySchedule.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing booked today.
            </p>
          ) : (
            <ul className="grid gap-2">
              {data.todaySchedule.map((row) => (
                <li key={row.id}>
                  <AppointmentRow row={row} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <StatTile
        label="Pending confirmations"
        value={data.pendingConfirmations}
        sublabel={
          data.pendingConfirmations > 0
            ? "Patients waiting on you"
            : "Inbox is clear"
        }
        to="/my-appointments"
      />

      <StatTile
        label="Earnings (30 days)"
        value={formatPHP(data.earnings.last30Days)}
        sublabel={`${formatPHP(data.earnings.allTime)} all-time`}
        to="/payments"
      />

      <StatTile
        label="Rating"
        value={`★ ${ratingDisplay}`}
        sublabel={`${data.rating.count} ${data.rating.count === 1 ? "review" : "reviews"}`}
      />
    </div>
  );
};
