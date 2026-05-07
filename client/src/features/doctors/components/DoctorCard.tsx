import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { formatPHP } from "@/lib/utils/formatCurrency";
import type { PublicDoctor } from "../schemas";

interface DoctorCardProps {
  doctor: PublicDoctor;
}

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("") || "Dr";

export const DoctorCard = ({ doctor }: DoctorCardProps) => {
  const rating = doctor.averageRating
    ? Number(doctor.averageRating).toFixed(1)
    : null;

  return (
    <Link
      to={`/doctors/${doctor.id}`}
      className="group block focus:outline-none"
    >
      <div className="h-full rounded-xl border bg-card p-4 transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials(doctor.fullName)}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-start justify-between gap-1.5">
              <p className="text-sm font-semibold leading-snug">
                {doctor.fullName}
              </p>
              {doctor.isVerified && (
                <Badge
                  variant="success"
                  className="shrink-0 px-1.5 text-[10px]"
                >
                  ✓
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {doctor.specializationName}
            </p>
          </div>
        </div>

        {doctor.bio && (
          <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
            {doctor.bio}
          </p>
        )}

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="text-amber-400">★</span>
            {rating ?? "New"}
          </span>
          <span className="font-semibold text-foreground">
            {formatPHP(doctor.consultationFee)}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {doctor.yearsOfExperience} yr
          {doctor.yearsOfExperience !== 1 ? "s" : ""} experience
        </p>
      </div>
    </Link>
  );
};
