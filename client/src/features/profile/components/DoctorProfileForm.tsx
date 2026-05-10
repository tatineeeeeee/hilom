import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/FormField";
import { extractApiError } from "@/lib/helpers/errors";
import { cn } from "@/lib/utils";
import { updateDoctorProfile } from "../api";
import { profileQueryKey } from "../hooks";
import { SpecializationSelect } from "./SpecializationSelect";
import {
  doctorProfileSchema,
  isSlotDuration,
  slotDurationValues,
  type DoctorProfile,
  type DoctorProfileInput,
} from "../schemas";

interface DoctorProfileFormProps {
  initial: DoctorProfile | null;
}

export const DoctorProfileForm = ({ initial }: DoctorProfileFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DoctorProfileInput>({
    resolver: zodResolver(doctorProfileSchema),
    defaultValues: {
      specializationId: initial?.specializationId ?? 0,
      bio: initial?.bio ?? "",
      yearsOfExperience: initial?.yearsOfExperience ?? 0,
      consultationFee: initial ? Number(initial.consultationFee) : 0,
      clinicAddress: initial?.clinicAddress ?? "",
      slotDurationMinutes:
        initial && isSlotDuration(initial.slotDurationMinutes)
          ? initial.slotDurationMinutes
          : 30,
    },
  });

  const mutation = useMutation({
    mutationFn: updateDoctorProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileQueryKey });
      toast.success("Profile saved");
      navigate("/dashboard", { replace: true });
    },
  });

  const onSubmit = async (values: DoctorProfileInput) => {
    setServerError(null);
    try {
      await mutation.mutateAsync(values);
    } catch (err) {
      setServerError(extractApiError(err).error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Practice details
        </p>
        <div className="grid gap-4">
          <SpecializationSelect
            register={register}
            error={errors.specializationId}
          />

          <div className="grid gap-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell patients about your experience and approach"
              rows={5}
              aria-invalid={errors.bio ? true : undefined}
              {...register("bio")}
            />
            {errors.bio && (
              <p className="text-xs text-destructive">{errors.bio.message}</p>
            )}
          </div>

          <FormField
            id="yearsOfExperience"
            label="Years of experience"
            type="number"
            min="0"
            max="80"
            error={errors.yearsOfExperience?.message}
            {...register("yearsOfExperience", { valueAsNumber: true })}
          />

          <FormField
            id="consultationFee"
            label="Consultation fee (PHP)"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            error={errors.consultationFee?.message}
            {...register("consultationFee", { valueAsNumber: true })}
          />
        </div>
      </div>

      <Separator />

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Availability
        </p>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="slotDurationMinutes">Slot duration</Label>
            <select
              id="slotDurationMinutes"
              {...register("slotDurationMinutes", { valueAsNumber: true })}
              aria-invalid={errors.slotDurationMinutes ? true : undefined}
              className={cn(
                "min-h-11 rounded-md border border-input bg-background px-3 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-ring",
                errors.slotDurationMinutes && "border-destructive",
              )}
            >
              {slotDurationValues.map((d) => (
                <option key={d} value={d}>
                  {d} minutes
                </option>
              ))}
            </select>
            {errors.slotDurationMinutes && (
              <p className="text-xs text-destructive">
                {errors.slotDurationMinutes.message}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="clinicAddress">Clinic address (optional)</Label>
            <Textarea
              id="clinicAddress"
              placeholder="Where do you usually see patients?"
              rows={2}
              aria-invalid={errors.clinicAddress ? true : undefined}
              {...register("clinicAddress")}
            />
            {errors.clinicAddress && (
              <p className="text-xs text-destructive">
                {errors.clinicAddress.message}
              </p>
            )}
          </div>
        </div>
      </div>

      <Button type="submit" className="min-h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
};
