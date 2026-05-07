import {
  AlertCircle,
  Banknote,
  CheckCircle,
  Stethoscope,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/features/dashboard/components/StatTile";
import { useAdminStats, useUnverifiedDoctors } from "@/features/admin/hooks";
import { formatPHP } from "@/lib/utils/formatCurrency";
import type { UnverifiedDoctorRow } from "@/features/admin/schemas";

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

const formatJoined = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric" });

const DoctorListRow = ({ doctor }: { doctor: UnverifiedDoctorRow }) => (
  <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initials(doctor.fullName)}
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium">{doctor.fullName}</p>
      <p className="truncate text-xs text-muted-foreground">
        {doctor.specializationName} · {doctor.email}
      </p>
    </div>
    <div className="shrink-0 text-right">
      <p className="text-xs text-muted-foreground">
        Joined {formatJoined(doctor.createdAt)}
      </p>
      <Link
        to="/admin/doctors"
        className="text-xs font-medium text-primary hover:underline"
      >
        Review →
      </Link>
    </div>
  </div>
);

const UnverifiedDoctorsPanel = () => {
  const { data, isPending } = useUnverifiedDoctors(1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Pending verification</CardTitle>
          {data && data.total > 0 && (
            <Link
              to="/admin/doctors"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {isPending ? (
          <div className="grid gap-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
            <p className="text-sm text-muted-foreground">
              All doctors are verified.
            </p>
          </div>
        ) : (
          <ul>
            {data.rows.slice(0, 5).map((doctor) => (
              <li key={doctor.id}>
                <DoctorListRow doctor={doctor} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

const AdminDashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
    <Skeleton className="h-48 rounded-xl" />
  </div>
);

export const AdminDashboard = () => {
  const { data, isPending, isError } = useAdminStats();

  if (isPending) return <AdminDashboardSkeleton />;
  if (isError || !data) {
    return <p className="text-sm text-destructive">Could not load stats.</p>;
  }

  const activeDoctors = data.users.doctors - data.doctors.unverified;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile
          icon={<Users />}
          accent="teal"
          label="Total users"
          value={data.users.total}
          sublabel={`${data.users.patients} patients · ${data.users.doctors} doctors`}
          to="/admin/users"
        />
        <StatTile
          icon={<Stethoscope />}
          accent="blue"
          label="Active doctors"
          value={activeDoctors}
          sublabel={
            data.doctors.unverified > 0
              ? `${data.doctors.unverified} unverified pending`
              : "All verified"
          }
          to="/admin/doctors"
        />
        <StatTile
          icon={<Banknote />}
          accent="green"
          label="Revenue released"
          value={formatPHP(data.revenue.released)}
          sublabel={`${formatPHP(data.revenue.escrowed)} escrowed`}
        />
        <StatTile
          icon={<AlertCircle />}
          accent={data.doctors.unverified > 0 ? "amber" : undefined}
          label="Needs review"
          value={data.doctors.unverified}
          sublabel={
            data.doctors.unverified > 0 ? "Review pending" : "All caught up"
          }
          to="/admin/doctors"
        />
      </div>
      <UnverifiedDoctorsPanel />
    </div>
  );
};
