import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { cn } from "@/lib/utils";

type TileAccent = "teal" | "terracotta" | "calamansi" | "turmeric" | "indigo";

const iconClasses = {
  teal: "bg-primary/12 text-primary",
  terracotta: "bg-[oklch(0.88_0.06_50_/_0.30)] text-[oklch(0.40_0.10_50)]",
  calamansi: "bg-[oklch(0.70_0.13_130_/_0.15)] text-[oklch(0.30_0.10_130)]",
  turmeric: "bg-[oklch(0.78_0.13_85_/_0.15)] text-[oklch(0.40_0.10_85)]",
  indigo: "bg-[oklch(0.62_0.15_250_/_0.15)] text-[oklch(0.45_0.15_250)]",
} as const satisfies Record<TileAccent, string>;

const bgTintClasses = {
  teal: "bg-linear-to-br from-[oklch(0.520_0.105_195_/_0.16)] to-card",
  terracotta: "bg-linear-to-br from-[oklch(0.680_0.125_35_/_0.18)] to-card",
  calamansi: "bg-linear-to-br from-[oklch(0.700_0.130_130_/_0.18)] to-card",
  turmeric: "bg-linear-to-br from-[oklch(0.780_0.130_85_/_0.18)] to-card",
  indigo: "bg-linear-to-br from-[oklch(0.620_0.150_250_/_0.16)] to-card",
} as const satisfies Record<TileAccent, string>;

const iconGlowClasses = {
  teal: "shadow-[0_0_14px_3px_oklch(0.520_0.105_195_/_0.25)]",
  terracotta: "shadow-[0_0_14px_3px_oklch(0.680_0.125_35_/_0.25)]",
  calamansi: "shadow-[0_0_14px_3px_oklch(0.700_0.130_130_/_0.25)]",
  turmeric: "shadow-[0_0_14px_3px_oklch(0.780_0.130_85_/_0.25)]",
  indigo: "shadow-[0_0_14px_3px_oklch(0.620_0.150_250_/_0.25)]",
} as const satisfies Record<TileAccent, string>;

interface StatTileProps {
  label: ReactNode;
  value: string | number;
  sublabel?: string;
  to?: string;
  icon?: ReactNode;
  accent?: TileAccent;
  animate?: boolean;
}

export const StatTile = ({
  label,
  value,
  sublabel,
  to,
  icon,
  accent,
  animate,
}: StatTileProps) => {
  const displayValue =
    animate && typeof value === "number" ? (
      <NumberTicker value={value} />
    ) : (
      value
    );

  const inner = (
    <Card
      className={cn(
        accent && bgTintClasses[accent],
        to && "transition-shadow hover:shadow-md",
      )}
    >
      {icon ? (
        <CardContent className="flex items-center gap-3 pt-6">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              accent ? iconClasses[accent] : "bg-muted text-muted-foreground",
              accent && iconGlowClasses[accent],
            )}
          >
            <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="text-2xl font-semibold leading-tight">
              {displayValue}
            </p>
            {sublabel && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {sublabel}
              </p>
            )}
          </div>
        </CardContent>
      ) : (
        <>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{displayValue}</p>
            {sublabel && (
              <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {inner}
      </Link>
    );
  }
  return inner;
};
