import { LinkButton } from "@/components/ui/link-button";

export const NotFoundPage = () => {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-2xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you're looking for doesn't exist or has moved.
      </p>
      <LinkButton to="/" className="mt-6">
        Back to home
      </LinkButton>
    </section>
  );
};
