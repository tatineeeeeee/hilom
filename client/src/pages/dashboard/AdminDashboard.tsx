import { formatPHP } from "@/lib/utils/formatCurrency";
import { useAdminStats } from "@/features/admin/hooks";
import { StatTile } from "@/features/dashboard/components/StatTile";

export const AdminDashboard = () => {
  const { data, isPending, isError } = useAdminStats();

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (isError || !data) {
    return <p className="text-sm text-destructive">Could not load stats.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatTile
        label="Total users"
        value={data.users.total}
        sublabel={`${data.users.patients} patients · ${data.users.doctors} doctors · ${data.users.admins} admins`}
        to="/admin/users"
      />
      <StatTile
        label="Appointments"
        value={data.appointments.total}
        sublabel={`${data.appointments.pending} pending · ${data.appointments.confirmed} confirmed · ${data.appointments.completed} done`}
      />
      <StatTile
        label="Revenue released"
        value={formatPHP(data.revenue.released)}
        sublabel={`${formatPHP(data.revenue.escrowed)} escrowed`}
      />
      <StatTile
        label="Unverified doctors"
        value={data.doctors.unverified}
        sublabel={
          data.doctors.unverified > 0 ? "Review pending" : "All caught up"
        }
        to="/admin/doctors"
      />
    </div>
  );
};
