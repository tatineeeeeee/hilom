import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/features/auth/hooks";
import { MedicationRow } from "../components/MedicationRow";
import { useWritePrescription } from "../hooks";
import { emptyMedication, type MedicationInput } from "../schemas";

const MAX_MEDICATIONS = 20;

export const WritePrescriptionPage = () => {
  const { id: appointmentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notes, setNotes] = useState("");
  const [medications, setMedications] = useState<MedicationInput[]>([
    emptyMedication(),
  ]);

  const { mutate: write, isPending } = useWritePrescription(
    appointmentId ?? "",
  );

  if (user?.role !== "doctor") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <p className="text-sm text-destructive">
          Only doctors can issue prescriptions.
        </p>
      </div>
    );
  }

  const handleChange = (index: number, next: MedicationInput) => {
    setMedications((prev) => prev.map((m, i) => (i === index ? next : m)));
  };

  const handleRemove = (index: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    if (medications.length >= MAX_MEDICATIONS) return;
    setMedications((prev) => [...prev, emptyMedication()]);
  };

  const isValid = medications.every(
    (m) =>
      m.medicationName.trim() &&
      m.dosage.trim() &&
      m.frequency.trim() &&
      m.duration.trim(),
  );

  const handleSubmit = () => {
    if (!appointmentId) return;
    write(
      {
        notes: notes.trim() || undefined,
        medications: medications.map((m) => ({
          ...m,
          instructions: m.instructions?.trim() || undefined,
        })),
      },
      {
        onSuccess: () => {
          toast.success("Prescription issued");
          navigate(`/appointments/${appointmentId}/prescription`);
        },
        onError: () => toast.error("Failed to issue prescription"),
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <PageHeader title="Issue prescription" />

      <div className="mb-6 grid gap-1.5">
        <Label htmlFor="rx-notes">
          Notes <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="rx-notes"
          placeholder="General instructions, allergies noted, follow-up date..."
          maxLength={4000}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <p className="text-right text-xs text-muted-foreground">
          {notes.length}/4000
        </p>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <p className="text-sm font-semibold">Medications</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
          {medications.length}
        </span>
      </div>

      <div className="mb-4 grid gap-3">
        {medications.map((med, i) => (
          <MedicationRow
            key={i}
            index={i}
            value={med}
            onChange={handleChange}
            onRemove={handleRemove}
            isOnly={medications.length === 1}
          />
        ))}
      </div>

      {medications.length < MAX_MEDICATIONS && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="mb-6"
        >
          + Add medication
        </Button>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isPending || !isValid}
        className="w-full"
      >
        {isPending ? "Issuing…" : "Issue prescription"}
      </Button>
    </div>
  );
};
