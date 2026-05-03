import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPHP } from "@/lib/utils/formatCurrency";
import { useDoctor } from "../hooks";
import { SlotPicker } from "../components/SlotPicker";

export const DoctorDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: doctor, isPending, isError } = useDoctor(id ?? "");

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-center text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (isError || !doctor) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">Doctor not found.</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => navigate("/doctors")}
        >
          Back to list
        </Button>
      </div>
    );
  }

  const rating = doctor.averageRating
    ? Number(doctor.averageRating).toFixed(1)
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2"
        onClick={() => navigate(-1)}
      >
        ← Back
      </Button>

      <Card className="mb-4">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>{doctor.fullName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {doctor.specializationName}
              </p>
            </div>
            {doctor.isVerified && <Badge variant="success">Verified</Badge>}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              <span className="text-amber-400">★</span>{" "}
              {rating ?? "No rating yet"}
            </span>
            <span className="font-medium">
              {formatPHP(doctor.consultationFee)} / consult
            </span>
            <span className="text-muted-foreground">
              {doctor.yearsOfExperience} yr
              {doctor.yearsOfExperience !== 1 ? "s" : ""} experience
            </span>
          </div>

          {doctor.clinicAddress && (
            <p className="text-sm text-muted-foreground">
              📍 {doctor.clinicAddress}
            </p>
          )}
        </CardContent>
      </Card>

      {doctor.bio && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-sm">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{doctor.bio}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Book a slot</CardTitle>
        </CardHeader>
        <CardContent>
          <SlotPicker doctorId={doctor.id} />
        </CardContent>
      </Card>
    </div>
  );
};
