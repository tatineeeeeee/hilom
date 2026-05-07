import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminUserRow } from "../schemas";

const roleColors: Record<AdminUserRow["role"], string> = {
  patient: "bg-blue-100 text-blue-800",
  doctor: "bg-emerald-100 text-emerald-800",
  admin: "bg-purple-100 text-purple-800",
};

const formatDay = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

interface UserRowProps {
  user: AdminUserRow;
}

export const UserRow = ({ user }: UserRowProps) => (
  <Card>
    <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid gap-0.5">
        <p className="text-sm font-medium">{user.fullName}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge className={roleColors[user.role]} variant="outline">
          {user.role}
        </Badge>
        {user.emailVerifiedAt ? (
          <span>verified</span>
        ) : (
          <span className="text-amber-600">unverified email</span>
        )}
        <span>· joined {formatDay(user.createdAt)}</span>
      </div>
    </CardContent>
  </Card>
);
