import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { extractApiError } from "@/lib/helpers/errors";
import { verifyEmail } from "../api";
import { useAuth } from "../hooks";

type State =
  | { kind: "missing" }
  | { kind: "verifying" }
  | { kind: "success" }
  | { kind: "failure"; error: string };

export const VerifyEmailPage = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<State>(() =>
    token ? { kind: "verifying" } : { kind: "missing" },
  );
  const dispatched = useRef(false);

  useEffect(() => {
    if (!token || dispatched.current) return;
    dispatched.current = true;
    verifyEmail(token)
      .then(() => {
        setState({ kind: "success" });
        toast.success("Email verified.");
      })
      .catch((err: unknown) => {
        setState({ kind: "failure", error: extractApiError(err).error });
      });
  }, [token]);

  useEffect(() => {
    if (state.kind !== "success") return;
    const t = setTimeout(() => {
      navigate(isAuthenticated ? "/dashboard" : "/login", { replace: true });
    }, 3000);
    return () => clearTimeout(t);
  }, [state, isAuthenticated, navigate]);

  return (
    <AuthLayout
      title="Verify your email"
      footer={
        <Link to="/login" className="font-medium text-foreground underline">
          Back to login
        </Link>
      }
    >
      {state.kind === "missing" && (
        <Alert variant="destructive">
          <AlertDescription>
            Missing verification link. Open the link from your email to
            continue.
          </AlertDescription>
        </Alert>
      )}
      {state.kind === "verifying" && (
        <p className="text-center text-sm text-muted-foreground">
          Verifying your email…
        </p>
      )}
      {state.kind === "success" && (
        <p className="text-center text-sm">
          Email verified. Redirecting you in a moment…
        </p>
      )}
      {state.kind === "failure" && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
    </AuthLayout>
  );
};
