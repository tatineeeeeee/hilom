import { useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPHP } from "@/lib/utils/formatCurrency";
import { useAuth } from "@/features/auth/hooks";
import { DoctorReviewsSection } from "@/features/reviews/components/DoctorReviewsSection";
import { useDoctor } from "../hooks";
import { SlotPicker } from "../components/SlotPicker";

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("") || "Dr";

export const DoctorDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const slotPickerRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, user } = useAuth();
  const { data: doctor, isPending, isError, refetch } = useDoctor(id ?? "");

  const hasBottomNav = isAuthenticated && user?.role !== "admin";

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-xl border bg-muted/40" />
          <div className="h-24 animate-pulse rounded-xl border bg-muted/40" />
          <div className="h-48 animate-pulse rounded-xl border bg-muted/40" />
        </div>
      </div>
    );
  }

  if (isError || !doctor) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">Doctor not found.</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/doctors")}
          >
            Back to list
          </Button>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const rating = doctor.averageRating
    ? Number(doctor.averageRating).toFixed(1)
    : null;

  const scrollToSlots = () => {
    slotPickerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2"
        onClick={() => navigate(-1)}
      >
        ← Back
      </Button>

      {/* Profile hero */}
      <div className="mb-4 rounded-xl border bg-card p-5">
        <div className="flex items-start gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {initials(doctor.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h1 className="text-lg font-bold">{doctor.fullName}</h1>
                <p className="text-sm text-muted-foreground">
                  {doctor.specializationName}
                </p>
              </div>
              {doctor.isVerified && <Badge variant="success">✓ Verified</Badge>}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1">
                <span className="text-amber-400">★</span>
                {rating ?? "No rating yet"}
              </span>
              <span className="font-semibold">
                {formatPHP(doctor.consultationFee)} / consult
              </span>
              <span className="text-muted-foreground">
                {doctor.yearsOfExperience} yr
                {doctor.yearsOfExperience !== 1 ? "s" : ""} exp.
              </span>
            </div>
            {doctor.clinicAddress && (
              <p className="mt-2 text-sm text-muted-foreground">
                📍 {doctor.clinicAddress}
              </p>
            )}
          </div>
        </div>
      </div>

      {doctor.bio && (
        <div className="mb-4 rounded-xl border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold">About</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {doctor.bio}
          </p>
        </div>
      )}

      <div ref={slotPickerRef} className="mb-4 rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Book a slot</h2>
        <SlotPicker doctorId={doctor.id} doctorName={doctor.fullName} />
      </div>

      <DoctorReviewsSection doctorId={doctor.id} />

      {/* Sticky booking CTA on mobile */}
      <div
        className={cn(
          "fixed left-0 right-0 border-t bg-background/95 p-3 backdrop-blur sm:hidden",
          hasBottomNav ? "bottom-16" : "bottom-0",
        )}
      >
        <Button className="w-full" onClick={scrollToSlots}>
          Book appointment ↑
        </Button>
      </div>
    </div>
  );
};
