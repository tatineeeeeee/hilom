import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormField } from "@/components/forms/FormField";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { extractApiError } from "@/lib/helpers/errors";
import { cn } from "@/lib/utils";
import { useAuth } from "../hooks";
import {
  registerDoctorSchema,
  registerPatientSchema,
  type RegisterDoctorInput,
  type RegisterPatientInput,
} from "../schemas";

type RoleTab = "patient" | "doctor";

export const RegisterPage = () => {
  const [tab, setTab] = useState<RoleTab>("patient");
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Hilom as a patient or doctor"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-foreground underline">
            Log in
          </Link>
        </>
      }
    >
      <RoleTabs value={tab} onChange={setTab} />
      <div className="mt-6">
        {tab === "patient" ? <PatientForm /> : <DoctorForm />}
      </div>
    </AuthLayout>
  );
};

interface RoleTabsProps {
  value: RoleTab;
  onChange: (next: RoleTab) => void;
}

const RoleTabs = ({ value, onChange }: RoleTabsProps) => {
  const tabs: { id: RoleTab; label: string }[] = [
    { id: "patient", label: "Patient" },
    { id: "doctor", label: "Doctor" },
  ];
  return (
    <div
      role="tablist"
      className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "min-h-[40px] rounded text-sm font-medium transition",
            value === t.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

const PatientForm = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
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
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters with upper, lower, and a number"
        error={errors.password?.message}
        {...register("password")}
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

const DoctorForm = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

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
        error={errors.phone?.message}
        {...register("phone")}
      />
      <FormField
        id="doctor-password"
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters with upper, lower, and a number"
        error={errors.password?.message}
        {...register("password")}
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
