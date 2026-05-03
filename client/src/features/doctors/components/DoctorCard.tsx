import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPHP } from "@/lib/utils/formatCurrency";
import type { PublicDoctor } from "../schemas";

interface DoctorCardProps {
  doctor: PublicDoctor;
}

const StarRating = ({ value }: { value: string | null }) => {
  const num = value ? Math.round(Number(value) * 10) / 10 : null;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className="text-amber-400">★</span>
      {num !== null ? num.toFixed(1) : "—"}
    </span>
  );
};

export const DoctorCard = ({ doctor }: DoctorCardProps) => (
  <Link to={`/doctors/${doctor.id}`} className="group block focus:outline-none">
    <Card className="h-full transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm leading-snug">
            {doctor.fullName}
          </CardTitle>
          {doctor.isVerified && (
            <Badge variant="success" className="shrink-0">
              Verified
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {doctor.specializationName}
        </p>
      </CardHeader>
      <CardContent className="grid gap-2">
        {doctor.bio && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {doctor.bio}
          </p>
        )}
        <div className="flex items-center justify-between">
          <StarRating value={doctor.averageRating} />
          <span className="text-xs font-medium">
            {formatPHP(doctor.consultationFee)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {doctor.yearsOfExperience} yr
          {doctor.yearsOfExperience !== 1 ? "s" : ""} experience
        </p>
      </CardContent>
    </Card>
  </Link>
);
