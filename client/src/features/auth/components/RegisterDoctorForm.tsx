import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormField } from "@/components/forms/FormField";
import { extractApiError } from "@/lib/helpers/errors";
import { useAuth } from "../hooks";
import { registerDoctorSchema, type RegisterDoctorInput } from "../schemas";
import { EyeToggle } from "./EyeToggle";

export const RegisterDoctorForm = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterDoctorInput>({
    resolver: zodResolver(registerDoctorSchema),
    defaultValues: {
      role: "doctor",
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      phone: "",
    },
  });

  const onSubmit = async (values: RegisterDoctorInput) => {
    setServerError(null);
    try {
      await registerUser(values);
      navigate("/profile/setup", { replace: true });
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
      <input type="hidden" {...register("role")} value="doctor" />
      <FormField
        id="doctor-fullName"
        label="Full name"
        autoComplete="name"
        error={errors.fullName?.message}
        {...register("fullName")}
      />
      <FormField
        id="doctor-email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <FormField
        id="doctor-phone"
        label="Phone (optional)"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        maxLength={16}
        error={errors.phone?.message}
        {...register("phone")}
      />
      <FormField
        id="doctor-password"
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
        id="doctor-confirmPassword"
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
      <p className="text-xs text-muted-foreground">
        After signing up, complete your specialization, bio, and consultation
        fee in profile setup.
      </p>
      <Button
        type="submit"
        className="min-h-11 w-full"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Creating account…" : "Create doctor account"}
      </Button>
    </form>
  );
};
