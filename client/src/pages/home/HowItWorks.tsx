import { useRef } from "react";
import { motion } from "motion/react";
import {
  Activity,
  CalendarCheck,
  CreditCard,
  FileText,
  MessageCircle,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { AnimatedBeam } from "@/components/ui/animated-beam";

const BEAM_FROM = "oklch(0.520 0.105 195)";
const BEAM_TO = "oklch(0.680 0.125 35)";

const STEPS = [
  {
    num: "1",
    icon: Search,
    title: "Search",
    body: "Filter by specialization, fee, or rating. Read reviews from other patients.",
    iconCls: "bg-primary/10 text-primary",
  },
  {
    num: "2",
    icon: CalendarCheck,
    title: "Book",
    body: "Pick a slot from the doctor's live availability. Add a quick reason for the visit.",
    iconCls: "bg-[oklch(0.62_0.15_250/0.14)] text-[oklch(0.45_0.15_250)]",
  },
  {
    num: "3",
    icon: CreditCard,
    title: "Pay",
    body: "Confirm via GCash, Maya, or card. We hold it in escrow until the visit happens.",
    iconCls: "bg-[oklch(0.70_0.13_130/0.14)] text-[oklch(0.30_0.10_130)]",
  },
  {
    num: "4",
    icon: Stethoscope,
    title: "Consult",
    body: "Chat in real time, get a prescription, leave a review. Money releases to the doctor.",
    iconCls: "bg-[oklch(0.88_0.06_50/0.30)] text-[oklch(0.40_0.10_50)]",
  },
];

const CHIPS = [
  { icon: MessageCircle, label: "Real-time chat", cls: "text-primary" },
  {
    icon: ShieldCheck,
    label: "Escrow payment",
    cls: "text-[oklch(0.30_0.10_130)]",
  },
  { icon: FileText, label: "Digital Rx", cls: "text-[oklch(0.40_0.10_50)]" },
];

const MarketplaceFlow = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const patientRef = useRef<HTMLDivElement>(null);
  const platformRef = useRef<HTMLDivElement>(null);
  const doctorRef = useRef<HTMLDivElement>(null);

  return (
    <div className="mb-10">
      <div
        ref={containerRef}
        className="relative mx-auto flex h-44 max-w-md items-center justify-between px-8"
      >
        {/* Patient */}
        <div className="z-10 flex flex-col items-center gap-2">
          <div
            ref={patientRef}
            className="flex size-14 items-center justify-center rounded-full border-2 bg-card shadow-md"
          >
            <UserRound className="size-6 text-muted-foreground" aria-hidden />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Patient
          </span>
        </div>

        {/* Hilom platform */}
        <div className="z-10 flex flex-col items-center gap-2">
          <div className="relative">
            <motion.div
              className="absolute -inset-2 rounded-full border-2 border-primary/30"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <div
              ref={platformRef}
              className="relative flex size-16 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/10 shadow-md"
            >
              <Activity className="size-7 text-primary" aria-hidden />
            </div>
          </div>
          <span className="text-xs font-semibold text-primary">Hilom</span>
        </div>

        {/* Doctor */}
        <div className="z-10 flex flex-col items-center gap-2">
          <div
            ref={doctorRef}
            className="flex size-14 items-center justify-center rounded-full border-2 bg-card shadow-md"
          >
            <Stethoscope className="size-6 text-muted-foreground" aria-hidden />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Doctor
          </span>
        </div>

        <AnimatedBeam
          containerRef={containerRef}
          fromRef={patientRef}
          toRef={platformRef}
          pathColor="#94a3b8"
          pathOpacity={0.4}
          gradientStartColor={BEAM_FROM}
          gradientStopColor={BEAM_TO}
          duration={4}
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={platformRef}
          toRef={doctorRef}
          pathColor="#94a3b8"
          pathOpacity={0.4}
          gradientStartColor={BEAM_FROM}
          gradientStopColor={BEAM_TO}
          duration={4}
          delay={0.5}
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={platformRef}
          toRef={patientRef}
          reverse
          pathColor="#94a3b8"
          pathOpacity={0.4}
          gradientStartColor={BEAM_TO}
          gradientStopColor={BEAM_FROM}
          duration={4}
          delay={1}
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={doctorRef}
          toRef={platformRef}
          reverse
          pathColor="#94a3b8"
          pathOpacity={0.4}
          gradientStartColor={BEAM_TO}
          gradientStopColor={BEAM_FROM}
          duration={4}
          delay={1.5}
        />
      </div>

      {/* Capability chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {CHIPS.map(({ icon: Icon, label, cls }) => (
          <span
            key={label}
            className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium shadow-sm"
          >
            <Icon className={`size-3.5 ${cls}`} aria-hidden />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

export const HowItWorks = () => (
  <section className="mx-auto max-w-5xl px-4 py-12">
    <h2 className="mb-1 text-center text-3xl font-bold tracking-tight sm:text-4xl">
      How it works
    </h2>
    <p className="mb-10 text-center text-sm text-muted-foreground">
      Four steps from "I should see a doctor" to "I have a prescription."
    </p>
    <MarketplaceFlow />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map(({ num, icon: Icon, title, body, iconCls }) => (
        <div key={num} className="flex flex-col rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-6 min-w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {num}
            </span>
            <div
              className={`flex size-9 items-center justify-center rounded-lg ${iconCls}`}
            >
              <Icon className="size-4" aria-hidden />
            </div>
          </div>
          <h3 className="mb-1 text-sm font-semibold">{title}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {body}
          </p>
        </div>
      ))}
    </div>
  </section>
);
