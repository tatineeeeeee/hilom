# Phase 9 — Dashboards

> **Prompt**: `do phase 9 ultrathink this`
>
> Act as a senior full-stack engineer. Read `docs/phase-9-plan.md` end to end,
> then implement every sitting server-first: schemas → services → controllers
> → routes → tests (run them, fix until green) → client code. Use the
> project's existing patterns (feature-based folders, Zod validation,
> asyncHandler, AppError, TanStack Query hooks, shadcn components, `formatDate`
>
> - `formatCurrency` utils). No `as`, no `any`, mobile-first, 150/300 line caps.
>   Commit after each logical milestone and run lint + typecheck before each
>   commit. Do NOT skip tests.

---

## Goal

Make `/dashboard` actually useful for each role. Today the page is mostly
placeholder cards: "Recent prescriptions" with no data, "Platform health"
with hard-coded copy. Replace those with role-specific dashboards backed by
real queries — what matters at a glance for that user.

The dashboards are not new product surface; everything they show is already
reachable elsewhere. The job is curation: pick the 3–5 things each role
actually checks first, surface them in one screen, and link out for the
detail.

## Scope

Single sitting. Most of the work is client-side wiring; the server
contributes one new aggregate endpoint and reuses Phase 8's stats endpoint
for admin.

| Step | Server                             | Client                                                                                             |
| ---- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1    | `GET /api/me/doctor-stats` + tests | Split DashboardPage into PatientDashboard, DoctorDashboard, AdminDashboard; wire real data in each |

Not in scope (backlog): charts/graphs (current month earnings is a number,
not a chart), per-month earnings drill-down, "appointments by hour"
heatmaps, exportable reports, custom date ranges, real-time push updates of
dashboard counters.

---

## Existing data sources (no migration needed)

Everything the dashboards need is already in the DB:

```
appointments       — for next/upcoming + today's schedule + pending count
prescriptions      — for "recent prescriptions"
payments           — for doctor earnings (sum where status = released)
reviews + doctor_profiles.average_rating — for doctor rating widget
```

No schema changes.

---

## Sitting 1 — Doctor Stats Endpoint + Three Dashboards

### Server

#### New file: `server/src/services/doctor.service.ts` (extend)

Add an aggregate function that bundles everything the doctor dashboard
needs into one call — avoids 4 separate round-trips on dashboard mount.

```ts
export interface DoctorStats {
  todaySchedule: {
    id: string;
    patientName: string;
    slotStart: string;
    slotEnd: string;
    status: "pending" | "confirmed" | "completed" | "cancelled";
    paymentStatus: "pending" | "escrowed" | "released" | "refunded" | null;
  }[];
  pendingConfirmations: number;
  earnings: {
    last30Days: string;       // sum of payments.amount where released_at >= now() - 30d
    allTime: string;
  };
  rating: {
    average: string | null;   // doctor_profiles.average_rating
    count: number;            // count of reviews where doctor_id = userId
  };
}

export const getDoctorStats = async (
  doctorUserId: string,
): Promise<DoctorStats>;
```

- "Today" is computed in Manila time (existing `todayInManila` util).
- `todaySchedule` returns at most 20 entries — if a doctor has more than 20
  appointments in a single day they have bigger problems than dashboard pagination.
- `earnings.last30Days` filters on `released_at`, not `created_at` — money
  in the doctor's pocket, not money escrowed for future visits.

#### New file: `server/src/controllers/profile.controller.ts` (extend)

```ts
export const getDoctorStats; // GET /api/me/doctor-stats
```

`requireAuth` + role check (`req.user.role === "doctor"` → otherwise 403).
Calls service with `req.user.id`.

#### Modify: `server/src/routes/profile.routes.ts`

```ts
profileRouter.get("/doctor-stats", asyncHandler(getDoctorStats));
```

Mounted at `/api/me/doctor-stats`.

**Patient stats**: don't add a dedicated endpoint. The patient dashboard
needs (a) next appointment — already served by `useMyAppointments`, and
(b) recent prescriptions — already served by `useMyPrescriptions`. Wiring
two existing queries on the dashboard is cheaper than a new endpoint and
the payloads are small.

**Admin stats**: reuses `GET /api/admin/stats` from Phase 8. If Phase 9
lands before Phase 8's admin sitting, build the stats endpoint here and
move it into `admin.service.ts` later — call it out in the commit.

---

### Server Tests: `server/tests/doctor-stats.test.ts`

1. **Patient gets 403** — non-doctor role calling `/api/me/doctor-stats` → 403.
2. **No auth → 401**.
3. **Empty state shape is valid** — fresh doctor with no data → all fields present, counts are 0, arrays are empty, earnings strings are "0.00".
4. **Today's schedule excludes other days** — seed two appointments (today, tomorrow) → todaySchedule has 1 row.
5. **Today's schedule includes confirmed and completed but excludes cancelled** — sanity check on filter semantics.
6. **Pending confirmations count** — seed 3 pending + 2 confirmed → count is 3.
7. **Earnings sum matches released payments** — seed two completed+paid+released → earnings.allTime equals their sum; one cancelled+refunded → not counted.
8. **Earnings 30-day window** — seed one released payment dated 40 days ago, one dated 10 days ago → last30Days only counts the recent one.
9. **Rating reflects the doctor_profiles row** — seed reviews → rating.average matches recomputed value, rating.count matches review count.

(9 tests.)

---

### Client (Sitting 1)

#### Refactor: `client/src/pages/DashboardPage.tsx`

Today it's a 178-line file with role branches inline. Split into three
focused pages, each under 150 lines, plus a shell that picks the right one.

```
client/src/pages/dashboard/
  DashboardPage.tsx           — thin shell that switches on user.role
  PatientDashboard.tsx
  DoctorDashboard.tsx
  AdminDashboard.tsx
  components/
    StatTile.tsx              — number + label + optional sublabel
    AppointmentRow.tsx        — compact row used in "today's schedule"
    PrescriptionRow.tsx       — compact row for "recent prescriptions"
```

If `StatTile` already lands in Phase 8 under `features/admin/components/`,
move it to `features/dashboard/components/` (or `components/ui/`) so both
admin and dashboard import from one place. Don't duplicate.

#### `PatientDashboard.tsx`

Three cards:

- **Next appointment** — first item from `useMyAppointments({ page: 1 })`
  filtered to `pending | confirmed`. If none → "No upcoming visits — find
  a doctor". Click → `/appointments`.
- **Recent prescriptions** — first 3 items from `useMyPrescriptions()`.
  Each row shows doctor name + date + medication count. Click row →
  `/appointments/:id/prescription`. Empty → friendly nudge.
- **Quick book** — link to `/doctors`.

Keep the `<ProfileCompletionBanner />` at the top (already exists).

#### `DoctorDashboard.tsx`

Single fetch via `useDoctorStats()` (new hook against `/api/me/doctor-stats`).

Layout (mobile-first, 1-col → `sm:` 2-col → `lg:` 3-col):

- **Today's schedule** — list of `AppointmentRow`s from `stats.todaySchedule`.
  Empty → "Nothing booked today." Click row → appointment detail.
- **Pending confirmations** — `StatTile` with `stats.pendingConfirmations`,
  click → `/my-appointments?status=pending`.
- **Earnings (30 days)** — `StatTile` with `formatPHP(stats.earnings.last30Days)`,
  subtitle `formatPHP(stats.earnings.allTime) + " all-time"`.
- **Rating** — `StatTile` with stars + count. Click → public doctor page.

#### `AdminDashboard.tsx`

Uses `useAdminStats()` (from Phase 8's admin feature folder). Renders
`StatTile`s for: total users (with role breakdown as sublabel), appointments
by status, revenue released, unverified doctors (click → `/admin/doctors`).

If Phase 8 hasn't shipped yet, this page falls back to placeholders and
gets wired in the same Phase 8 sitting that lands the stats endpoint.

#### New: `client/src/features/dashboard/hooks.ts`

```ts
export const useDoctorStats = () =>
  useQuery({
    queryKey: ["doctor-stats"],
    queryFn: getDoctorStats,
    staleTime: 30_000,
    enabled: useAuthStore((s) => s.user?.role === "doctor"),
  });
```

Same shape as the existing feature hooks. `getDoctorStats` lives in
`features/dashboard/api.ts`.

Cross-feature cache invalidation: when an appointment status changes
(`useUpdateAppointmentStatus` / `useCancelAppointment`), invalidate
`["doctor-stats"]` so the dashboard recomputes. When a payment is confirmed
(`useConfirmPaymentMock`), invalidate it too. Add to those existing hooks'
`onSuccess` invalidate lists.

---

### Client Tests (deferred to Phase 10)

Phase 10 owns automated frontend tests. For Phase 9, manual smoke test in
the browser per role:

- Patient: log in, see next appointment + recent prescriptions populate, click
  through to detail pages.
- Doctor: today's schedule shows real bookings; pending count matches list
  page; earnings number changes after completing a paid appointment.
- Admin: stats numbers match what's seeded.

Document each in the PR.

---

## API Summary

| Method | Path                 | Auth   | Description                                 |
| ------ | -------------------- | ------ | ------------------------------------------- |
| GET    | /api/me/doctor-stats | doctor | Aggregate snapshot for the doctor dashboard |
| GET    | /api/admin/stats     | admin  | (from Phase 8) Platform stats               |

---

## Commit Strategy (3 commits)

```
feat(dashboard): add doctor-stats endpoint + 9 tests
feat(dashboard): split DashboardPage into role-specific dashboards
feat(dashboard): wire real data into patient and admin dashboards
```

If Phase 8 hasn't landed when Phase 9 starts, fold the admin wiring into
that Phase 8 follow-up rather than blocking on it — Phase 9 can ship
patient + doctor first and admin after.

---

## Implementation Notes

- **Why one aggregate endpoint for doctor, not three queries**: Dashboards
  fire all their queries at mount. Three round-trips at 100ms each is
  300ms of perceived latency on Philippine LTE. One query is one paint.
  Patient dashboard reuses existing endpoints because their payloads are
  already cheap and reused elsewhere — adding `/api/me/patient-stats`
  would just be an alias for two queries we're already running on other
  pages, so we'd lose the cache reuse.
- **Why earnings filter on `released_at`, not `created_at`**: A payment
  created today but not yet released isn't earnings — it's a liability
  (we owe it back if the appointment cancels). Doctors see the number that
  matters: cash in their account.
- **Why "today" is Manila-bound**: The product is PH-only. UTC midnight
  rollovers would cut today's schedule off mid-day for users in Manila.
  Use the existing `todayInManila` util — same call site as slot generation.
- **Why split the dashboard file instead of leaving one file with branches**:
  At 178 lines today, adding more per-role widgets would push it past 300.
  Three small files are easier to evolve independently.
- **Why move shared `StatTile` up if it exists**: Two near-duplicate components
  diverge fast. One canonical version with role-agnostic props prevents
  visual drift between the admin dashboard and the doctor dashboard.
- **Why no charts**: Lightweight numbers + a small list cover the
  question each role actually has ("what's on for today / how much have I
  earned / who needs verifying"). A chart introduces a heavy library
  (recharts adds ~80KB), inconsistent dark-mode behavior, and one more
  thing to test. Defer to Phase 11 polish if a recruiter wants visual
  flair.
- **Why staleTime 30s on doctor-stats**: Same as appointment lists. Long
  enough to avoid refetching on every tab focus; short enough that a
  freshly-completed appointment shows up reflective of reality.
- **Why client-side dashboard guards**: Admin dashboard is admin-only
  client-side via `AdminLayout`; doctor dashboard inside `DashboardPage`
  switches on role. Server-side is the source of truth (the stats
  endpoint rejects 403 anyway), but the client switch avoids fetching the
  wrong endpoint for the wrong role.
- **Mobile-first**: All three dashboards stack to one column below `sm:`.
  Tap targets stay ≥44px; cards are clickable as a whole, not just the
  CTA inside them.
- **No `as` / `any`**: `DoctorStats` is a hand-typed interface (mirrors the
  service return). Hooks return `UseQueryResult<DoctorStats>` from
  TanStack Query — no narrowing in components.
- **Line caps**: PatientDashboard, DoctorDashboard, AdminDashboard each
  stay under 150 lines if the row + tile components do the rendering.
  DashboardPage shell is 20-ish lines — just a switch on role.
