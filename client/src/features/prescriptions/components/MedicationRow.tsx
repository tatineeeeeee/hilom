import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MedicationInput } from "../schemas";

interface MedicationRowProps {
  index: number;
  value: MedicationInput;
  onChange: (index: number, next: MedicationInput) => void;
  onRemove: (index: number) => void;
  isOnly: boolean;
}

export const MedicationRow = ({
  index,
  value,
  onChange,
  onRemove,
  isOnly,
}: MedicationRowProps) => {
  const field =
    (key: keyof MedicationInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(index, { ...value, [key]: e.target.value });

  const n = index + 1;

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          Medication {n}
        </p>
        {!isOnly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-7 px-2 text-destructive hover:text-destructive"
          >
            Remove
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`med-name-${n}`}>Medication name</Label>
          <Input
            id={`med-name-${n}`}
            placeholder="e.g. Amoxicillin"
            maxLength={255}
            value={value.medicationName}
            onChange={field("medicationName")}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`med-dose-${n}`}>Dosage</Label>
          <Input
            id={`med-dose-${n}`}
            placeholder="e.g. 500mg"
            maxLength={100}
            value={value.dosage}
            onChange={field("dosage")}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`med-freq-${n}`}>Frequency</Label>
          <Input
            id={`med-freq-${n}`}
            placeholder="e.g. 3x daily"
            maxLength={100}
            value={value.frequency}
            onChange={field("frequency")}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`med-dur-${n}`}>Duration</Label>
          <Input
            id={`med-dur-${n}`}
            placeholder="e.g. 7 days"
            maxLength={100}
            value={value.duration}
            onChange={field("duration")}
          />
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`med-instr-${n}`}>
            Instructions{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id={`med-instr-${n}`}
            placeholder="e.g. Take with food"
            maxLength={2000}
            rows={2}
            value={value.instructions ?? ""}
            onChange={field("instructions")}
          />
        </div>
      </div>
    </div>
  );
};
