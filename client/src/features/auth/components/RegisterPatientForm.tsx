import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormField } from "@/components/forms/FormField";
import { extractApiError } from "@/lib/helpers/errors";
import { useAuth } from "../hooks";
import { registerPatientSchema, type RegisterPatientInput } from "../schemas";
import { EyeToggle } from "./EyeToggle";

export const RegisterPatientForm = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterPatientInput>({
    resolver: zodResolver(registerPatientSchema),
    defaultValues: {
      role: "patient",
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      phone: "",
    },
  });

  const onSubmit = async (values: RegisterPatientInput) => {
    setServerError(null);
    try {
      await registerUser(values);
      navigate("/dashboard", { replace: true });
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
      <input type="hidden" {...register("role")} value="patient" />
      <FormField
        id="patient-fullName"
        label="Full name"
        autoComplete="name"
        error={errors.fullName?.message}
        {...register("fullName")}
      />
      <FormField
        id="patient-email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <FormField
        id="patient-phone"
        label="Phone (optional)"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        error={errors.phone?.message}
        {...register("phone")}
      />
      <FormField
        id="patient-password"
        label="Password"
        type={showPw ? "text" : "password"}
        autoComplete="new-password"
        hint="At least 8 characters with upper, lower, and a number"
        error={errors.password?.message}
        action={
          <EyeToggle show={showPw} onToggle={() => setShowPw((p) => !p)} />
        }
        {...register("password")}
      />
      <FormField
        id="patient-confirmPassword"
        label="Confirm password"
        type={showConfirm ? "text" : "password"}
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        action={
          <EyeToggle
            show={showConfirm}
            onToggle={() => setShowConfirm((p) => !p)}
          />
        }
        {...register("confirmPassword")}
      />
      <Button
        type="submit"
        className="min-h-11 w-full"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Creating account…" : "Create patient account"}
      </Button>
    </form>
  );
};
