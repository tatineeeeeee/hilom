import {
  MessageCircle,
  Minus,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/StatTile";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { DaySchedule } from "@/features/dashboard/components/DaySchedule";
import { GreetingHeader } from "@/features/dashboard/components/GreetingHeader";
import { useDoctorStats } from "@/features/dashboard/hooks";
import { useUnreadCount, useConversationList } from "@/features/chat/hooks";
import { useAuthStore } from "@/features/auth/store";
import { formatPHP } from "@/lib/utils/formatCurrency";
import { initials } from "@/lib/utils/initials";
import type { DoctorStats } from "@/features/dashboard/schemas";

const sparkPoints = (days: { date: string; amount: string }[]): string => {
  if (days.length === 0) return "0,15 100,15";
  const values = days.map((d) => parseFloat(d.amount));
  const max = Math.max(...values);
  if (max === 0)
    return values
      .map((_, i) => `${(i / (values.length - 1)) * 100},15`)
      .join(" ");
  return values
    .map((v, i) => {
      const x = values.length === 1 ? 50 : (i / (values.length - 1)) * 100;
      const y = 30 - (v / max) * 26 - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
};

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

  const points = sparkPoints(earnings.last7Days);

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
              className={`flex items-center gap-1 pb-0.5 text-xs font-medium ${trendClass}`}
            >
              {trendIcon}
              {trendLabel}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatPHP(earnings.allTime)} all-time
          </p>
          <svg
            viewBox="0 0 100 30"
            className="mt-3 h-8 w-full text-primary/60"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </CardContent>
      </Card>
    </Link>
  );
};

const pendingAccent = (count: number) => {
  if (count === 0) return undefined;
  return "turmeric" as const;
};

const pendingSublabel = (count: number): string => {
  if (count === 0) return "Inbox is clear";
  if (count === 1) return "Patient waiting on you";
  return `${count} patients waiting`;
};

const ChatTile = ({ unread }: { unread: number }) => {
  const { data: convData } = useConversationList(1);
  const unreadConvs = (convData?.conversations ?? [])
    .filter((c) => c.unreadCount > 0)
    .slice(0, 3);

  return (
    <Link
      to="/messages"
      className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="bg-linear-to-br from-[oklch(0.620_0.150_250/0.16)] to-card transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-3 pt-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.62_0.15_250/0.15)] text-[oklch(0.45_0.15_250)] shadow-[0_0_14px_3px_oklch(0.620_0.150_250/0.25)]">
            <span className="[&>svg]:h-5 [&>svg]:w-5">
              <MessageCircle />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Messages
            </p>
            <p className="text-2xl font-semibold leading-tight">{unread}</p>
            {unreadConvs.length > 0 ? (
              <div className="mt-1 flex -space-x-1.5">
                {unreadConvs.map((c) => (
                  <div
                    key={c.id}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary ring-2 ring-card"
                    title={c.otherPartyName}
                  >
                    {initials(c.otherPartyName)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                unread
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

const DoctorDashboardSkeleton = () => (
  <div className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-4">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
    <Skeleton className="h-48 rounded-xl" />
  </div>
);

export const DoctorDashboard = () => {
  const fullName = useAuthStore((s) => s.user?.fullName ?? "");
  const { data, isPending, isError, refetch } = useDoctorStats();
  const { data: unread } = useUnreadCount();

  if (isPending) return <DoctorDashboardSkeleton />;
  if (isError || !data) {
    return (
      <QueryErrorState
        message="Couldn't load stats."
        onRetry={() => void refetch()}
      />
    );
  }

  const ratingDisplay = data.rating.average
    ? Number(data.rating.average).toFixed(1)
    : "—";

  const pendingLabel = (
    <span className="flex items-center gap-1.5">
      Pending
      {data.hasStalePending && (
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
      )}
    </span>
  );

  return (
    <div className="space-y-4">
      <GreetingHeader variant="doctor" fullName={fullName} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <EarningsTile earnings={data.earnings} />
        <ChatTile unread={unread ?? 0} />
        <StatTile
          label={pendingLabel}
          accent={pendingAccent(data.pendingConfirmations)}
          value={data.pendingConfirmations}
          sublabel={pendingSublabel(data.pendingConfirmations)}
          to="/my-appointments"
          animate
        />
        <StatTile
          icon={<Star />}
          accent="teal"
          label="Rating"
          value={`★ ${ratingDisplay}`}
          sublabel={`${data.rating.count} ${data.rating.count === 1 ? "review" : "reviews"}`}
        />
      </div>
      <DaySchedule schedule={data.todaySchedule} />
    </div>
  );
};
