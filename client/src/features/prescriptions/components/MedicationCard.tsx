import type { Medication } from "../schemas";

interface MedicationCardProps {
  medication: Medication;
  index: number;
}

export const MedicationCard = ({ medication, index }: MedicationCardProps) => (
  <div className="rounded-lg border p-4">
    <div className="flex items-start justify-between gap-2">
      <p className="text-base font-semibold">{medication.medicationName}</p>
      <p className="shrink-0 text-xs text-muted-foreground">
        Medication {index + 1}
      </p>
    </div>

    <div className="mt-3 grid grid-cols-3 gap-2">
      <div>
        <p className="text-xs text-muted-foreground">Dosage</p>
        <p className="text-sm font-medium">{medication.dosage}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Frequency</p>
        <p className="text-sm font-medium">{medication.frequency}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Duration</p>
        <p className="text-sm font-medium">{medication.duration}</p>
      </div>
    </div>

    {medication.instructions && (
      <div className="mt-3 border-t pt-3">
        <p className="text-xs text-muted-foreground">
          Instructions: {medication.instructions}
        </p>
      </div>
    )}
  </div>
);
