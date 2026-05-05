import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  CreditCard,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { useAuth } from "@/features/auth/hooks";
import { listSpecializations } from "@/features/auth/api";
import { SpecializationIcon } from "./home/SpecializationIcon";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Verified doctors only",
    body: "Every doctor in the public list has been reviewed by our admin team. Credentials, specialization, and consultation fee are visible up-front — no surprises.",
  },
  {
    icon: CreditCard,
    title: "Escrow payments",
    body: "Pay with GCash, Maya, or any major card via PayMongo. Funds are held until your visit is completed. Cancel before completion and you're refunded — automatically.",
  },
  {
    icon: MessageSquareText,
    title: "Real-time chat & prescriptions",
    body: "Once a booking is confirmed, message your doctor in real time. After the visit, your prescription lands directly in your account — no clinic pickups.",
  },
];

const STEPS = [
  {
    num: "1",
    icon: Search,
    title: "Search",
    body: "Filter by specialization, fee, or rating. Read reviews from other patients.",
  },
  {
    num: "2",
    icon: CalendarCheck,
    title: "Book",
    body: "Pick a slot from the doctor's live availability. Add a quick reason for the visit.",
  },
  {
    num: "3",
    icon: CreditCard,
    title: "Pay",
    body: "Confirm your payment. We hold it in escrow until the visit happens.",
  },
  {
    num: "4",
    icon: Stethoscope,
    title: "Consult",
    body: "Chat in real time, get a prescription, leave a review. Money releases to the doctor.",
  },
];

const SpecializationsGrid = () => {
  const { data, isPending } = useQuery({
    queryKey: ["specializations"],
    queryFn: listSpecializations,
    staleTime: 5 * 60_000,
  });

  if (isPending || !data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border bg-muted/40"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {data.map((s) => (
        <Link
          key={s.id}
          to={`/doctors?specializationId=${s.id}`}
          className="group flex flex-col items-start gap-2 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
        >
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <SpecializationIcon name={s.iconName} className="size-5" />
          </div>
          <p className="text-sm font-medium">{s.name}</p>
          {s.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {s.description}
            </p>
          )}
        </Link>
      ))}
    </div>
  );
};

export const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="bg-gradient-to-b from-background via-background to-primary/5">
      {/* Hero */}
      <section className="mx-auto flex max-w-5xl flex-col items-center px-4 pb-16 pt-12 text-center sm:pt-20">
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" aria-hidden />
          Healthcare for the Philippines
        </span>
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

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border bg-card p-5 shadow-sm"
            >
              <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                <Icon className="size-5" aria-hidden />
              </div>
              <h3 className="mb-1.5 text-base font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-1 text-center text-3xl font-bold tracking-tight sm:text-4xl">
          How it works
        </h2>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Four steps from "I should see a doctor" to "I have a prescription."
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ num, icon: Icon, title, body }) => (
            <div key={num} className="rounded-xl border bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {num}
                </span>
                <Icon className="size-4 text-muted-foreground" aria-hidden />
              </div>
              <h3 className="mb-1 text-sm font-semibold">{title}</h3>
              <p className="text-xs text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Specializations */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-1 text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Browse by specialization
        </h2>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Ten specializations and growing. Click one to see verified doctors.
        </p>
        <SpecializationsGrid />
      </section>

      {/* Split CTAs */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-8">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              For patients
            </p>
            <h3 className="mb-3 text-2xl font-semibold">
              Stop calling clinics. Book in two taps.
            </h3>
            <p className="mb-5 text-sm text-muted-foreground">
              Sign up free, browse our verified doctor list, and book your first
              appointment in under a minute.
            </p>
            <LinkButton to="/register" size="lg">
              Sign up as a patient
            </LinkButton>
          </div>
          <div className="rounded-2xl border bg-card p-8">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              For doctors
            </p>
            <h3 className="mb-3 text-2xl font-semibold">
              Take control of your bookings.
            </h3>
            <p className="mb-5 text-sm text-muted-foreground">
              Set your own schedule, fee, and slot duration. Get paid via escrow
              — funds release after each completed visit.
            </p>
            <LinkButton to="/register" size="lg" variant="outline">
              Apply as a doctor
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-5xl px-4 pb-12 pt-6">
        <div className="flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Hilom — built in the Philippines.</p>
          <nav className="flex flex-wrap items-center gap-4">
            <a
              href="/api/docs"
              className="hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              API docs
            </a>
            <a
              href="https://github.com/tatineeeeeee/hilom"
              className="hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <Link to="/login" className="hover:text-foreground">
              Log in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};
