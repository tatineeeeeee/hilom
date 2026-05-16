import { useRef } from "react";
import {
  Activity,
  CalendarCheck,
  CreditCard,
  Search,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { AnimatedBeam } from "@/components/ui/animated-beam";

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
    body: "Confirm your payment via GCash, Maya, or card. We hold it in escrow until the visit happens.",
  },
  {
    num: "4",
    icon: Stethoscope,
    title: "Consult",
    body: "Chat in real time, get a prescription, leave a review. Money releases to the doctor.",
  },
];

const MarketplaceFlow = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const patientRef = useRef<HTMLDivElement>(null);
  const platformRef = useRef<HTMLDivElement>(null);
  const doctorRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto mb-10 flex h-28 max-w-sm items-center justify-between px-6"
    >
      <div className="z-10 flex flex-col items-center gap-1.5">
        <div
          ref={patientRef}
          className="flex size-12 items-center justify-center rounded-full border bg-card shadow-sm"
        >
          <UserRound className="size-5 text-muted-foreground" aria-hidden />
        </div>
        <span className="text-xs text-muted-foreground">Patient</span>
      </div>

      <div className="z-10 flex flex-col items-center gap-1.5">
        <div
          ref={platformRef}
          className="flex size-14 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 shadow-sm"
        >
          <Activity className="size-6 text-primary" aria-hidden />
        </div>
        <span className="text-xs font-medium text-primary">Hilom</span>
      </div>

      <div className="z-10 flex flex-col items-center gap-1.5">
        <div
          ref={doctorRef}
          className="flex size-12 items-center justify-center rounded-full border bg-card shadow-sm"
        >
          <Stethoscope className="size-5 text-muted-foreground" aria-hidden />
        </div>
        <span className="text-xs text-muted-foreground">Doctor</span>
      </div>

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={patientRef}
        toRef={platformRef}
        pathColor="#d4d4d8"
        gradientStartColor="oklch(0.520 0.105 195)"
        gradientStopColor="oklch(0.680 0.125 35)"
        duration={4}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={platformRef}
        toRef={doctorRef}
        pathColor="#d4d4d8"
        gradientStartColor="oklch(0.520 0.105 195)"
        gradientStopColor="oklch(0.680 0.125 35)"
        duration={4}
        delay={0.5}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={platformRef}
        toRef={patientRef}
        reverse
        pathColor="#d4d4d8"
        gradientStartColor="oklch(0.680 0.125 35)"
        gradientStopColor="oklch(0.520 0.105 195)"
        duration={4}
        delay={1}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={doctorRef}
        toRef={platformRef}
        reverse
        pathColor="#d4d4d8"
        gradientStartColor="oklch(0.680 0.125 35)"
        gradientStopColor="oklch(0.520 0.105 195)"
        duration={4}
        delay={1.5}
      />
    </div>
  );
};

export const HowItWorks = () => (
  <section className="mx-auto max-w-5xl px-4 py-12">
    <h2 className="mb-1 text-center text-3xl font-bold tracking-tight sm:text-4xl">
      How it works
    </h2>
    <p className="mb-8 text-center text-sm text-muted-foreground">
      Four steps from "I should see a doctor" to "I have a prescription."
    </p>
    <MarketplaceFlow />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map(({ num, icon: Icon, title, body }) => (
        <div
          key={num}
          className="flex items-start gap-4 rounded-xl border bg-card p-5 sm:flex-col sm:gap-0"
        >
          <div className="flex shrink-0 size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground sm:mb-3">
            {num}
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-sm font-semibold">{title}</h3>
              <Icon className="size-3.5 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-xs text-muted-foreground">{body}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);
