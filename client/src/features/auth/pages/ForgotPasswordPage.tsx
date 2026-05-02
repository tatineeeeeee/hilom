import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/FormField";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { requestPasswordReset } from "../api";
import { forgotPasswordSchema, type ForgotPasswordInput } from "../schemas";

export const ForgotPasswordPage = () => {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordInput) => {
    try {
      await requestPasswordReset(values.email);
    } catch {
      // Always show the same fixed message — never leak whether the email exists.
    } finally {
      setSubmitted(true);
    }
  };

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="We'll email you a link to choose a new one."
      footer={
        <Link to="/login" className="font-medium text-foreground underline">
          Back to login
        </Link>
      }
    >
      {submitted ? (
        <p className="text-center text-sm text-muted-foreground">
          If an account exists for that email, a password-reset link has been
          sent. Check your inbox in the next minute.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4"
          noValidate
        >
          <FormField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Button
            type="submit"
            className="min-h-11 w-full"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
};
