import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { MedicationCard } from "../components/MedicationCard";
import { usePrescriptionByAppointment } from "../hooks";

export const ViewPrescriptionPage = () => {
  const { id: appointmentId } = useParams<{ id: string }>();
  const {
    data: rx,
    isPending,
    isError,
  } = usePrescriptionByAppointment(appointmentId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="print:hidden">
        <PageHeader
          title="Prescription"
          action={
            <Link
              to="/appointments"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back
            </Link>
          }
        />
      </div>

      {isPending && (
        <div className="grid gap-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      )}

      {isError && (
        <p className="mt-6 text-sm text-muted-foreground">
          No prescription issued yet.
        </p>
      )}

      {rx && (
        <div className="rounded-lg border">
          <div className="flex items-center gap-2 border-b px-5 py-3">
            <span className="font-semibold tracking-tight">Hilom</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Prescription
            </span>
          </div>

          <div className="grid gap-3 border-b px-5 py-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Doctor</p>
              <p className="text-sm font-medium">{rx.doctorName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Patient</p>
              <p className="text-sm font-medium">{rx.patientName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Issued</p>
              <p className="text-sm">
                {new Date(rx.createdAt).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {rx.notes && (
            <div className="border-b px-5 py-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Notes
              </p>
              <p className="text-sm">{rx.notes}</p>
            </div>
          )}

          <div className="px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Medications ({rx.medications.length})
            </p>
            <div className="grid gap-3">
              {rx.medications.map((med, i) => (
                <MedicationCard key={med.id} medication={med} index={i} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
