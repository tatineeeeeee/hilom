import { cn } from "@/lib/utils";
import type { Specialization } from "@/types";

interface DoctorSpecialtyChipsProps {
  specs: Specialization[];
  activeSpecIds: number[];
  onToggle: (id: number) => void;
}

export const DoctorSpecialtyChips = ({
  specs,
  activeSpecIds,
  onToggle,
}: DoctorSpecialtyChipsProps) => {
  if (specs.length === 0) return null;
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:pb-0">
      {specs.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onToggle(s.id)}
          className={cn(
            "flex-none rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            activeSpecIds.includes(s.id)
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          {s.name}
        </button>
      ))}
    </div>
  );
};
