import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserRow } from "../components/UserRow";
import { useAdminUsers } from "../hooks";

const ROLES = [
  { label: "All", value: undefined },
  { label: "Patients", value: "patient" as const },
  { label: "Doctors", value: "doctor" as const },
  { label: "Admins", value: "admin" as const },
];

export const UserManagementPage = () => {
  const [role, setRole] = useState<
    "patient" | "doctor" | "admin" | undefined
  >();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState<string | undefined>();

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim() || undefined);
      setPage(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data, isPending, isError } = useAdminUsers({ page, role, search });
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <Button
            key={r.label}
            variant={role === r.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setRole(r.value);
              setPage(1);
            }}
          >
            {r.label}
          </Button>
        ))}
      </div>

      <Input
        placeholder="Search by name or email…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="mb-4"
      />

      {isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
      {isError && (
        <p className="text-sm text-destructive">Could not load users.</p>
      )}

      {data && data.rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No users match.</p>
      )}

      {data && data.rows.length > 0 && (
        <div className="grid gap-2">
          {data.rows.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
