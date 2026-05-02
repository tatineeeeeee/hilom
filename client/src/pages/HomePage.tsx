import { LinkButton } from "@/components/ui/link-button";
import { useAuth } from "@/features/auth/hooks";

export const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <section className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-4xl flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
        Find a doctor.{" "}
        <span className="text-muted-foreground">Book in minutes.</span>
      </h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
        Hilom connects patients with verified doctors across the Philippines.
        Browse specializations, pick a slot, pay securely, and chat with your
        doctor — all in one place.
      </p>
      <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
        {isAuthenticated ? (
          <LinkButton to="/dashboard" size="lg" className="min-h-11">
            Go to dashboard
          </LinkButton>
        ) : (
          <>
            <LinkButton to="/register" size="lg" className="min-h-11">
              Get started
            </LinkButton>
            <LinkButton
              to="/login"
              size="lg"
              variant="outline"
              className="min-h-11"
            >
              I already have an account
            </LinkButton>
          </>
        )}
      </div>
    </section>
  );
};
