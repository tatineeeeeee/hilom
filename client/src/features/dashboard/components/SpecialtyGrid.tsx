import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity,
  Baby,
  Bone,
  Brain,
  Droplets,
  Eye,
  Flower2,
  Heart,
  Scissors,
  Smile,
  Stethoscope,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { listSpecializations } from "@/features/specializations/api";

const SPECIALTY_ICONS: Record<string, LucideIcon> = {
  Cardiology: Heart,
  Pediatrics: Baby,
  "OB-Gyne": Flower2,
  Dermatology: Sun,
  "General Practice": Stethoscope,
  "Internal Medicine": Activity,
  Endocrinology: Droplets,
  Surgery: Scissors,
  Orthopedics: Bone,
  Psychiatry: Brain,
  Ophthalmology: Eye,
  Dentistry: Smile,
} as const;

const specialtyIcon = (name: string): LucideIcon =>
  SPECIALTY_ICONS[name] ?? Stethoscope;

export const SpecialtyGrid = () => {
  const { data, isPending } = useQuery({
    queryKey: ["specializations"],
    queryFn: listSpecializations,
    staleTime: 5 * 60_000,
  });

  return (
    <div>
      <p className="mb-3 text-sm font-medium">Browse by specialty</p>
      {isPending || !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {data.map((s) => {
            const Icon = specialtyIcon(s.name);
            return (
              <Link
                key={s.id}
                to={`/doctors?specializationId=${s.id}`}
                className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-shadow hover:shadow-md active:scale-[0.97]"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <Icon className="size-5" />
                </div>
                <p className="text-xs font-medium leading-tight">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.doctorCount} {s.doctorCount === 1 ? "doctor" : "doctors"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
