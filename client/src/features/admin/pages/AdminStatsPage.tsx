import { AlertCircle, Banknote, Stethoscope, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/StatTile";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { formatPHP } from "@/lib/utils/formatCurrency";
import { useAdminStats } from "../hooks";

export const AdminStatsPage = () => {
  const { data, isPending, isError, refetch } = useAdminStats();

  if (isPending) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <QueryErrorState
        message="Couldn't load stats."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <StatTile
        label="Total users"
        value={data.users.total}
        sublabel={`${data.users.patients} patients · ${data.users.doctors} doctors · ${data.users.admins} admins`}
        icon={<Users />}
        accent="teal"
      />
      <StatTile
        label="Appointments"
        value={data.appointments.total}
        sublabel={`${data.appointments.pending} pending · ${data.appointments.confirmed} confirmed · ${data.appointments.completed} done · ${data.appointments.cancelled} cancelled`}
        icon={<Stethoscope />}
        accent="indigo"
      />
      <StatTile
        label="Revenue released"
        value={formatPHP(data.revenue.released)}
        sublabel={`${formatPHP(data.revenue.escrowed)} escrowed`}
        icon={<Banknote />}
        accent="calamansi"
      />
      <StatTile
        label="Unverified doctors"
        value={data.doctors.unverified}
        sublabel={
          data.doctors.unverified > 0 ? "Review pending" : "All caught up"
        }
        icon={<AlertCircle />}
        accent="turmeric"
        to="/admin/doctors"
      />
    </div>
  );
};
