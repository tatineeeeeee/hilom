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
import { updatePatientProfile } from "../api";
import { profileQueryKey } from "../hooks";
import {
  bloodTypeValues,
  isBloodType,
  patientProfileSchema,
  type PatientProfile,
  type PatientProfileInput,
} from "../schemas";

interface PatientProfileFormProps {
  initial: PatientProfile | null;
}

export const PatientProfileForm = ({ initial }: PatientProfileFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PatientProfileInput>({
    resolver: zodResolver(patientProfileSchema),
    defaultValues: {
      dateOfBirth: initial?.dateOfBirth ?? "",
      bloodType:
        initial?.bloodType && isBloodType(initial.bloodType)
          ? initial.bloodType
          : undefined,
      allergies: initial?.allergies ?? "",
      emergencyContactName: initial?.emergencyContactName ?? "",
      emergencyContactPhone: initial?.emergencyContactPhone ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: updatePatientProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileQueryKey });
      toast.success("Profile saved");
      navigate("/dashboard", { replace: true });
    },
  });

  const onSubmit = async (values: PatientProfileInput) => {
    setServerError(null);
    try {
      await mutation.mutateAsync(values);
    } catch (err) {
      setServerError(extractApiError(err).error);
    }
  };

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Personal information
        </p>
        <div className="grid gap-4">
          <FormField
            id="dateOfBirth"
            label="Date of birth"
            type="date"
            max={todayIso}
            error={errors.dateOfBirth?.message}
            {...register("dateOfBirth")}
          />

          <div className="grid gap-1.5">
            <Label htmlFor="bloodType">Blood type</Label>
            <select
              id="bloodType"
              {...register("bloodType")}
              aria-invalid={errors.bloodType !== undefined}
              aria-describedby={
                errors.bloodType ? "bloodType-error" : undefined
              }
              className={cn(
                "min-h-11 rounded-md border border-input bg-background px-3 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-ring",
                errors.bloodType && "border-destructive",
              )}
            >
              <option value="">Select blood type (optional)</option>
              {bloodTypeValues.map((bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ))}
            </select>
            {errors.bloodType && (
              <p id="bloodType-error" className="text-xs text-destructive">
                {errors.bloodType.message}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="allergies">Known allergies</Label>
            <Textarea
              id="allergies"
              placeholder="e.g. Peanuts, penicillin"
              rows={3}
              aria-invalid={errors.allergies ? true : undefined}
              {...register("allergies")}
            />
            {errors.allergies && (
              <p className="text-xs text-destructive">
                {errors.allergies.message}
              </p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Emergency contact
        </p>
        <div className="grid gap-4">
          <FormField
            id="emergencyContactName"
            label="Contact name"
            autoComplete="name"
            error={errors.emergencyContactName?.message}
            {...register("emergencyContactName")}
          />

          <FormField
            id="emergencyContactPhone"
            label="Contact phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            error={errors.emergencyContactPhone?.message}
            {...register("emergencyContactPhone")}
          />
        </div>
      </div>

      <Button type="submit" className="min-h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
};
