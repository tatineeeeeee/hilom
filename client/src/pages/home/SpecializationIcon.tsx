import {
  Baby,
  Bone,
  Brain,
  BrainCog,
  Ear,
  Eye,
  HeartPulse,
  ScanFace,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  baby: Baby,
  "heart-pulse": HeartPulse,
  "scan-face": ScanFace,
  bone: Bone,
  brain: Brain,
  eye: Eye,
  ear: Ear,
  "brain-cog": BrainCog,
};

interface SpecializationIconProps {
  name: string | null;
  className?: string;
}

export const SpecializationIcon = ({
  name,
  className,
}: SpecializationIconProps) => {
  const resolved: LucideIcon = name
    ? (ICONS[name] ?? Stethoscope)
    : Stethoscope;
  const Icon = resolved;
  return <Icon className={className} aria-hidden />;
};
