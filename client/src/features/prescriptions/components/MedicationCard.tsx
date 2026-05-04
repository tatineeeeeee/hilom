import type { Medication } from "../schemas";

interface MedicationCardProps {
  medication: Medication;
  index: number;
}

export const MedicationCard = ({ medication, index }: MedicationCardProps) => (
  <div className="rounded-lg border p-4">
    <p className="mb-2 text-sm font-medium text-muted-foreground">
      Medication {index + 1}
    </p>
    <p className="text-base font-semibold">{medication.medicationName}</p>
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <span>Dosage: {medication.dosage}</span>
      <span>Frequency: {medication.frequency}</span>
      <span>Duration: {medication.duration}</span>
    </div>
    {medication.instructions && (
      <p className="mt-2 text-sm text-muted-foreground">
        Instructions: {medication.instructions}
      </p>
    )}
  </div>
);
