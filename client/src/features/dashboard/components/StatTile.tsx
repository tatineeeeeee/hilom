import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TileAccent = "teal" | "blue" | "amber" | "green";

const accentClasses = {
  teal: "bg-primary/10 text-primary",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  green:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
} as const satisfies Record<TileAccent, string>;

interface StatTileProps {
  label: ReactNode;
  value: string | number;
  sublabel?: string;
  to?: string;
  icon?: ReactNode;
  accent?: TileAccent;
}

export const StatTile = ({
  label,
  value,
  sublabel,
  to,
  icon,
  accent,
}: StatTileProps) => {
  const inner = (
    <Card className={to ? "transition-shadow hover:shadow-md" : ""}>
      {icon ? (
        <CardContent className="flex items-center gap-3 pt-6">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              accent ? accentClasses[accent] : "bg-muted text-muted-foreground",
            )}
          >
            <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="text-2xl font-semibold leading-tight">{value}</p>
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
            <p className="text-2xl font-semibold">{value}</p>
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
