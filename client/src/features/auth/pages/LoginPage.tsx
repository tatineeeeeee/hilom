import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormField } from "@/components/forms/FormField";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { useAuth } from "../hooks";
import { loginSchema, type LoginInput } from "../schemas";
import { extractApiError } from "@/lib/helpers/errors";

interface LocationState {
  from?: string;
}

const isLocationState = (value: unknown): value is LocationState => {
  if (typeof value !== "object" || value === null) return false;
  if (!("from" in value)) return true;
  const { from } = value;
  return typeof from === "string" || typeof from === "undefined";
};

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      await login(values);
      const from = isLocationState(location.state)
        ? location.state.from
        : undefined;
      navigate(from ?? "/dashboard", { replace: true });
    } catch (err) {
      setServerError(extractApiError(err).error);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to your Hilom account"
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-medium text-foreground underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button
          type="submit"
          className="min-h-11 w-full"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </AuthLayout>
  );
};
