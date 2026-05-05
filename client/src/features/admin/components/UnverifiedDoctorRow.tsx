import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { formatPHP } from "@/lib/utils/formatCurrency";
import { useVerifyDoctor } from "../hooks";
import type { UnverifiedDoctorRow as UnverifiedRow } from "../schemas";

interface UnverifiedDoctorRowProps {
  doctor: UnverifiedRow;
}

export const UnverifiedDoctorRow = ({ doctor }: UnverifiedDoctorRowProps) => {
  const { mutate, isPending } = useVerifyDoctor();

  const handleVerify = () => {
    mutate(
      { doctorProfileId: doctor.id, isVerified: true },
      {
        onSuccess: () => toast.success(`${doctor.fullName} verified`),
        onError: () => toast.error("Could not verify doctor"),
      },
    );
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-0.5">
          <p className="text-sm font-medium">{doctor.fullName}</p>
          <p className="text-xs text-muted-foreground">
            {doctor.specializationName} · {doctor.yearsOfExperience} yr
            {doctor.yearsOfExperience !== 1 ? "s" : ""} ·{" "}
            {formatPHP(doctor.consultationFee)}
          </p>
          {doctor.bio && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {doctor.bio}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton to={`/doctors/${doctor.id}`} variant="outline" size="sm">
            Review profile
          </LinkButton>
          <Button size="sm" onClick={handleVerify} disabled={isPending}>
            {isPending ? "Verifying…" : "Verify"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
