import { useParams, useNavigate } from "react-router-dom";
import { MedicationCard } from "../components/MedicationCard";
import { usePrescriptionByAppointment } from "../hooks";

export const ViewPrescriptionPage = () => {
  const { id: appointmentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    data: rx,
    isPending,
    isError,
  } = usePrescriptionByAppointment(appointmentId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back
      </button>

      <h1 className="mb-1 text-xl font-semibold tracking-tight sm:text-2xl">
        Prescription
      </h1>

      {isPending && <p className="text-sm text-muted-foreground">Loading…</p>}

      {isError && (
        <p className="mt-6 text-sm text-muted-foreground">
          No prescription issued yet.
        </p>
      )}

      {rx && (
        <>
          <div className="mb-6 grid gap-1 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Doctor:</span>{" "}
              {rx.doctorName}
            </p>
            <p>
              <span className="font-medium text-foreground">Patient:</span>{" "}
              {rx.patientName}
            </p>
            <p>
              <span className="font-medium text-foreground">Issued:</span>{" "}
              {new Date(rx.createdAt).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {rx.notes && (
            <div className="mb-6 rounded-lg border bg-muted/40 p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Notes
              </p>
              <p className="text-sm">{rx.notes}</p>
            </div>
          )}

          <h2 className="mb-3 text-base font-semibold">Medications</h2>
          <div className="grid gap-3">
            {rx.medications.map((med, i) => (
              <MedicationCard key={med.id} medication={med} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
