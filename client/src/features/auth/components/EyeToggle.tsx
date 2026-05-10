import { Eye, EyeOff } from "lucide-react";

interface EyeToggleProps {
  show: boolean;
  onToggle: () => void;
}

export const EyeToggle = ({ show, onToggle }: EyeToggleProps) => (
  <button
    type="button"
    tabIndex={-1}
    aria-label={show ? "Hide password" : "Show password"}
    onClick={onToggle}
    className="text-muted-foreground hover:text-foreground"
  >
    {show ? <EyeOff size={15} /> : <Eye size={15} />}
  </button>
);
