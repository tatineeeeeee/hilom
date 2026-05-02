import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { extractApiError } from "@/lib/helpers/errors";
import { resendVerification } from "../api";
import { useAuthStore } from "../store";

export const EmailVerificationBanner = () => {
  const user = useAuthStore((s) => s.user);
  const [dismissed, setDismissed] = useState(false);
  const [pending, setPending] = useState(false);

  if (!user || user.emailVerifiedAt !== null || dismissed) return null;

  const onResend = async () => {
    setPending(true);
    try {
      await resendVerification();
      toast.success("Verification email sent — check your inbox.");
    } catch (err) {
      toast.error(extractApiError(err).error);
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      role="status"
      className="border-b bg-amber-50 px-4 py-3 text-amber-900"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          Your email isn't verified yet. Check your inbox to keep your account
          secure.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={onResend}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Sending…" : "Resend email"}
          </Button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className="min-h-11 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
