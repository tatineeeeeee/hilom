import {
  Bell,
  Clock,
  Minus,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/features/dashboard/components/StatTile";
import { AppointmentRow } from "@/features/dashboard/components/AppointmentRow";
import { useDoctorStats } from "@/features/dashboard/hooks";
import { formatPHP } from "@/lib/utils/formatCurrency";
import type { DoctorStats } from "@/features/dashboard/schemas";

const EarningsTile = ({ earnings }: { earnings: DoctorStats["earnings"] }) => {
  const last30 = parseFloat(earnings.last30Days);
  const allTimeTotal = parseFloat(earnings.allTime);
  const avgPerMonth = allTimeTotal > 0 ? allTimeTotal / 12 : 0;

  let trendIcon: React.ReactNode;
  let trendLabel: string;
  let trendClass: string;

  if (avgPerMonth === 0 || last30 === 0) {
    trendIcon = <Minus className="h-3.5 w-3.5" />;
    trendLabel = "no data";
    trendClass = "text-muted-foreground";
  } else if (last30 > avgPerMonth * 1.1) {
    trendIcon = <TrendingUp className="h-3.5 w-3.5" />;
    trendLabel = "above avg";
    trendClass = "text-emerald-600";
  } else if (last30 < avgPerMonth * 0.9) {
    trendIcon = <TrendingDown className="h-3.5 w-3.5" />;
    trendLabel = "below avg";
    trendClass = "text-amber-600";
  } else {
    trendIcon = <Minus className="h-3.5 w-3.5" />;
    trendLabel = "on track";
    trendClass = "text-muted-foreground";
  }

  return (
    <Link
      to="/payments"
      className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Earnings (30 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2">
            <p className="text-2xl font-semibold">
              {formatPHP(earnings.last30Days)}
            </p>
            <span
              className={`flex items-center gap-1 text-xs font-medium pb-0.5 ${trendClass}`}
            >
              {trendIcon}
              {trendLabel}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatPHP(earnings.allTime)} all-time
          </p>
        </CardContent>
      </Card>
    </Link>
  );
};

const pendingAccent = (count: number) => {
  if (count === 0) return undefined;
  return "amber" as const;
};

const pendingSublabel = (count: number): string => {
  if (count === 0) return "Inbox is clear";
  if (count === 1) return "Patient waiting on you";
  return `${count} patients waiting`;
};

const ScheduleSection = ({
  schedule,
}: {
  schedule: DoctorStats["todaySchedule"];
}) => {
  const today = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Today's schedule</CardTitle>
          <span className="text-xs text-muted-foreground">{today}</span>
        </div>
      </CardHeader>
      <CardContent>
        {schedule.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Clock className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nothing scheduled today.
            </p>
            <Link
              to="/my-appointments"
              className="text-sm font-medium text-primary hover:underline"
            >
              Manage schedule →
            </Link>
          </div>
        ) : (
          <ul className="grid gap-1">
            {schedule.map((row) => (
              <li key={row.id}>
                <AppointmentRow row={row} variant="timeline" />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

const DoctorDashboardSkeleton = () => (
  <div className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-3">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
    <Skeleton className="h-48 rounded-xl" />
  </div>
);

export const DoctorDashboard = () => {
  const { data, isPending, isError } = useDoctorStats();

  if (isPending) return <DoctorDashboardSkeleton />;
  if (isError || !data) {
    return <p className="text-sm text-destructive">Could not load stats.</p>;
  }

  const ratingDisplay = data.rating.average
    ? Number(data.rating.average).toFixed(1)
    : "—";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <EarningsTile earnings={data.earnings} />
        <StatTile
          icon={<Bell />}
          accent={pendingAccent(data.pendingConfirmations)}
          label="Pending"
          value={data.pendingConfirmations}
          sublabel={pendingSublabel(data.pendingConfirmations)}
          to="/my-appointments"
        />
        <StatTile
          icon={<Star />}
          accent="teal"
          label="Rating"
          value={`★ ${ratingDisplay}`}
          sublabel={`${data.rating.count} ${data.rating.count === 1 ? "review" : "reviews"}`}
        />
      </div>
      <ScheduleSection schedule={data.todaySchedule} />
    </div>
  );
};
