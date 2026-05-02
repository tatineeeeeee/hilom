import { Link, type LinkProps } from "react-router-dom";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "./button";
import { cn } from "@/lib/utils";

type LinkButtonProps = LinkProps &
  VariantProps<typeof buttonVariants> & {
    className?: string;
  };

export const LinkButton = ({
  className,
  variant,
  size,
  ...rest
}: LinkButtonProps) => {
  return (
    <Link
      className={cn(buttonVariants({ variant, size }), className)}
      {...rest}
    />
  );
};
