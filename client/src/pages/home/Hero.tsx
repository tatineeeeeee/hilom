import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { useAuth } from "@/features/auth/hooks";

const QUICK_SPECIALTIES = [
  "General Medicine",
  "Pediatrics",
  "Cardiology",
  "Dermatology",
  "OB-Gynecology",
  "Psychiatry",
];

export const Hero = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/doctors?search=${encodeURIComponent(q)}` : "/doctors");
  };

  return (
    <section className="mx-auto flex max-w-5xl flex-col items-center px-4 pb-12 pt-12 text-center sm:pt-20">
      <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" aria-hidden />
        Healthcare for the Philippines
      </span>
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
        Find a doctor.{" "}
        <span className="text-muted-foreground">Book in minutes.</span>
      </h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
        Browse verified doctors across the Philippines, pick a slot, pay
        securely with GCash, Maya, or card, and chat with your doctor in real
        time — all in one place.
      </p>

      <form
        onSubmit={handleSearch}
        className="mt-8 flex w-full max-w-xl items-center gap-2 rounded-full border bg-card p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring/50"
      >
        <Search
          className="ml-3 size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by doctor, specialization, or symptom…"
          aria-label="Search doctors"
          className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button type="submit" size="lg" className="rounded-full">
          Search
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {QUICK_SPECIALTIES.map((spec) => (
          <button
            key={spec}
            type="button"
            onClick={() =>
              navigate(`/doctors?search=${encodeURIComponent(spec)}`)
            }
            className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground active:scale-[0.97]"
          >
            {spec}
          </button>
        ))}
      </div>

      <div className="mt-6 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
        {isAuthenticated ? (
          <LinkButton to="/dashboard" size="lg" className="min-h-11">
            Go to dashboard
          </LinkButton>
        ) : (
          <>
            <LinkButton to="/register" size="lg" className="min-h-11">
              Get started — free
            </LinkButton>
            <LinkButton
              to="/doctors"
              size="lg"
              variant="outline"
              className="min-h-11"
            >
              Browse doctors
            </LinkButton>
          </>
        )}
      </div>
    </section>
  );
};
