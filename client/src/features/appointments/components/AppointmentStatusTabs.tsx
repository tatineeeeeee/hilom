import { Button } from "@/components/ui/button";

const TABS = [
  { label: "All", value: undefined },
  { label: "Pending", value: "pending" as const },
  { label: "Confirmed", value: "confirmed" as const },
  { label: "Completed", value: "completed" as const },
  { label: "Cancelled", value: "cancelled" as const },
];

interface AppointmentStatusTabsProps {
  status: string | undefined;
  onChange: (next: string | undefined) => void;
}

export const AppointmentStatusTabs = ({
  status,
  onChange,
}: AppointmentStatusTabsProps) => (
  <div className="mb-4 flex flex-wrap gap-2">
    {TABS.map((tab) => (
      <Button
        key={tab.label}
        variant={status === tab.value ? "default" : "outline"}
        size="sm"
        onClick={() => onChange(tab.value)}
      >
        {tab.label}
      </Button>
    ))}
  </div>
);
