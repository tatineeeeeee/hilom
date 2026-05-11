import { Clock, MessageCircle, Pill } from "lucide-react";
import { StatTile } from "@/components/ui/StatTile";
import { useMyAppointments } from "@/features/appointments/hooks";
import { useMyPrescriptions } from "@/features/prescriptions/hooks";
import { useUnreadCount } from "@/features/chat/hooks";

const daysAgo = (isoDate: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoDate);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - target.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  const weeks = Math.floor(days / 7);
  if (days < 30) return `${weeks} weeks ago`;
  if (days < 60) return "1 month ago";
  return `${Math.floor(days / 30)} months ago`;
};

export const ActionTiles = () => {
  const { data: apptData } = useMyAppointments({ page: 1 });
  const { data: rxData } = useMyPrescriptions();
  const { data: unread } = useUnreadCount();

  const rxCount = rxData?.total ?? 0;
  const unreadCount = unread ?? 0;

  const lastVisit = (apptData?.appointments ?? [])
    .filter((a) => a.status === "completed")
    .sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate))[0];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatTile
        icon={<Pill />}
        accent="terracotta"
        label="Prescriptions"
        value={rxCount}
        sublabel="total"
        to="/prescriptions"
      />
      <StatTile
        icon={<MessageCircle />}
        accent="turmeric"
        label="Unread messages"
        value={unreadCount}
        sublabel="unread"
        to="/messages"
      />
      <StatTile
        icon={<Clock />}
        accent="teal"
        label="Last visit"
        value={lastVisit ? daysAgo(lastVisit.appointmentDate) : "—"}
        sublabel={lastVisit?.doctorName ?? "No visits yet"}
        to={lastVisit ? `/doctors/${lastVisit.doctorId}` : "/doctors"}
      />
    </div>
  );
};
