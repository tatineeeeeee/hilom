import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormField } from "@/components/forms/FormField";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { extractApiError } from "@/lib/helpers/errors";
import { resetPassword } from "../api";
import { useAuthStore } from "../store";
import { resetPasswordSchema, type ResetPasswordInput } from "../schemas";

export const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const clear = useAuthStore((s) => s.clear);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "" },
  });

  if (!token) {
    return (
      <AuthLayout
        title="Reset your password"
        footer={
          <Link to="/login" className="font-medium text-foreground underline">
            Back to login
          </Link>
        }
      >
        <Alert variant="destructive">
          <AlertDescription>
            Missing reset link. Request a new one from{" "}
            <Link to="/forgot-password" className="underline">
              forgot password
            </Link>
            .
          </AlertDescription>
        </Alert>
      </AuthLayout>
    );
  }

  const onSubmit = async (values: ResetPasswordInput) => {
    setServerError(null);
    try {
      await resetPassword(token, values.newPassword);
      clear();
      toast.success(
        "Password updated. All your other sessions have been logged out for security. Please log in with your new password.",
        { duration: 6000 },
      );
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      setServerError(extractApiError(err).error);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Pick a new one. 8+ characters, with upper, lower, and a number."
      footer={
        <Link to="/login" className="font-medium text-foreground underline">
          Back to login
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>
              {serverError}{" "}
              <Link to="/forgot-password" className="underline">
                Request a new link
              </Link>
            </AlertDescription>
          </Alert>
        )}
        <div className="grid gap-1.5">
          <FormField
            id="newPassword"
            label="New password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="self-end text-xs text-muted-foreground underline"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <Button
          type="submit"
          className="min-h-11 w-full"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthLayout>
  );
};
