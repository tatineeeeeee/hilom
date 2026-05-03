import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  action?: ReactNode;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ id, label, error, hint, action, className, ...rest }, ref) => {
    const errorId = error ? `${id}-error` : undefined;
    const hintId = hint && !error ? `${id}-hint` : undefined;
    const describedBy = errorId ?? hintId;
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        <div className="relative">
          <Input
            id={id}
            ref={ref}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={describedBy}
            className={cn(
              action && "pr-9",
              error && "border-destructive",
              className,
            )}
            {...rest}
          />
          {action && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2">
              {action}
            </span>
          )}
        </div>
        {hint && !error && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  },
);

FormField.displayName = "FormField";
