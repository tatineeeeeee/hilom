import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatTileProps {
  label: string;
  value: string | number;
  sublabel?: string;
}

export const StatTile = ({ label, value, sublabel }: StatTileProps) => (
  <Card>
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
  </Card>
);
