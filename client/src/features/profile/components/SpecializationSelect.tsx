import type { UseFormRegister, FieldError } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { useSpecializations } from "@/features/specializations/hooks";
import { cn } from "@/lib/utils";
import type { DoctorProfileInput } from "../schemas";

interface SpecializationSelectProps {
  register: UseFormRegister<DoctorProfileInput>;
  error: FieldError | undefined;
}

export const SpecializationSelect = ({
  register,
  error,
}: SpecializationSelectProps) => {
  const specializations = useSpecializations();

  return (
    <div className="grid gap-1.5">
      <Label htmlFor="specializationId">Specialization</Label>
      <select
        id="specializationId"
        {...register("specializationId", { valueAsNumber: true })}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "specializationId-error" : undefined}
        className={cn(
          "min-h-11 rounded-md border border-input bg-background px-3 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          error && "border-destructive",
        )}
        disabled={specializations.isLoading}
      >
        <option value={0}>
          {specializations.isLoading ? "Loading…" : "Select a specialization"}
        </option>
        {specializations.data?.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {error && (
        <p id="specializationId-error" className="text-xs text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
};
