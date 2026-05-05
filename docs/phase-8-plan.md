# Phase 8 — Reviews + Admin

> **Prompt**: `do phase 8 ultrathink this`
>
> Act as a senior full-stack engineer. Read `docs/phase-8-plan.md` end to end,
> then implement every sitting server-first: migration → schemas → services →
> controllers → routes → tests (run them, fix until green) → client code. Use
> the project's existing patterns (feature-based folders, Zod validation,
> asyncHandler, AppError, TanStack Query hooks, shadcn components, `formatDate`
>
> - `formatCurrency` utils). No `as`, no `any`, mobile-first, 150/300 line caps.
>   Commit after each logical milestone and run lint + typecheck before each
>   commit. Do NOT skip tests.

---

## Goal

Two related but distinct things land in this phase:

1. **Reviews are visible.** Phase 4 already lets a patient submit a 1–5 star
   rating + comment after a completed appointment, and the doctor's
   `average_rating` updates on insert. What's missing is anyone reading the
   reviews — DoctorDetailPage shows the average but no actual comments. Make
   reviews a public, readable part of the doctor's profile.
2. **Admin role becomes real.** Today `admin` is a user role with no surface
   area: no admin pages, no endpoints, no way to even create an admin user.
   Doctor verification (`doctor_profiles.is_verified`) exists but is never
   set or read, so unverified doctors appear in the public list as if
   they're vetted. Phase 8 closes that hole.

## Scope

Two sittings. Server-first, then client.

| Sitting | Server                                                                                         | Client                                                                               |
| ------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1       | List-doctor-reviews endpoint, hide unverified doctors from public list, tests                  | Reviews section on DoctorDetailPage, "verified" badge on cards, empty/loading states |
| 2       | Admin seed script, admin services + routes (users, doctor verification, platform stats), tests | AdminLayout + UserManagementPage + DoctorVerificationPage + AdminStatsPage, Navbar   |

Not in scope (backlog): edit/delete own review, owner reply to a review,
review moderation/flag-as-abuse, admin user suspension or soft-delete (would
need a `users.is_active` column + cascading rules — own ticket), audit log
of admin actions, admin password reset on behalf of users, granular admin
permissions (super-admin vs read-only).

---

## Existing schema (no migration needed)

```
reviews          — id, appointmentId (unique), patientId, doctorId, rating, comment, createdAt
doctor_profiles  — already has is_verified bool, average_rating decimal
users            — already has admin in user_role enum
```

No new tables. The whole phase is API + UI on top of existing columns.

If admin user-suspension lands later it'll add `users.is_active`. Out of
scope here so the schema stays untouched.

---

## Sitting 1 — Public Reviews + Verified-Only Doctor List

### Server

#### New: `GET /api/doctors/:id/reviews`

A public endpoint (no auth required) returning a paginated list of a doctor's
reviews. Mirrors how `/api/doctors/:id` is already public.

#### New file: `server/src/services/review.service.ts` (extend)

Add:

```ts
export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  patientName: string;
  createdAt: Date;
}

export interface PublicReviewsResult {
  reviews: PublicReview[];
  total: number;
  page: number;
  pageSize: number;
  averageRating: string | null;
  ratingCount: number;
}

export const listDoctorReviews = async (
  doctorProfileId: string,
  query: { page: number },
): Promise<PublicReviewsResult>;
```

- Look up doctor profile → resolve to `userId` (reviews are keyed by user id).
- Page size 10, ordered `createdAt DESC`.
- Return aggregate stats (`averageRating`, `ratingCount`) so the UI can show
  "4.8 ★ — 24 reviews" without a second query.

#### New file: `server/src/schemas/review.schema.ts` (extend)

```ts
export const REVIEWS_PAGE_SIZE = 10 as const;

export const listDoctorReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});
export type ListDoctorReviewsQuery = z.infer<
  typeof listDoctorReviewsQuerySchema
>;
```

#### Modify: `server/src/controllers/review.controller.ts`

Add `listDoctorReviews` handler — no `requireAuth`, validates query, calls service.

#### Modify: `server/src/routes/doctor.routes.ts`

```ts
doctorRouter.get("/:id/reviews", asyncHandler(listDoctorReviews));
```

#### Modify: `server/src/services/doctor.service.ts → findPublicDoctors`

Today this returns every doctor whether or not they're verified. Add a
default filter:

```ts
const conditions: SQL[] = [eq(doctorProfiles.isVerified, true)];
```

Always-on. Phase 8's admin sitting will flip the flag for real doctors. The
existing seeded demo doctor (`db:seed:doctor`) needs a one-line update to
seed with `isVerified: true` so dev doesn't go dark — call out in the
implementation as part of the same commit.

`findPublicDoctorById` should NOT add the filter — direct links to
unverified doctor pages still resolve so admins (and the doctor themselves)
can land on the page. The list is the public funnel.

---

### Server Tests: `server/tests/review.test.ts` (extend)

Today the suite covers create. Add:

1. **Public reviews list returns 200** — seed 3 reviews → GET returns 3 items, ordered by createdAt DESC.
2. **Returns aggregate stats** — averageRating + ratingCount match seeded values.
3. **Pagination** — seed 12 reviews, page 1 → 10, page 2 → 2.
4. **No auth required** — call without token → 200.
5. **404 for non-existent doctor** — GET unknown doctor profile id → 404.

`server/tests/doctor.test.ts` (extend):

6. **Public list excludes unverified doctors** — seed 1 verified, 1 unverified → GET `/api/doctors` returns 1.
7. **Direct GET `/api/doctors/:id` still works for unverified** — proves the filter only applies to the list.

(7 new tests on top of what's there.)

---

### Client (Sitting 1)

#### New: `client/src/features/reviews/`

A small feature folder (api, hooks, schemas, components). It's review-specific
so it lives outside `features/doctors/` and `features/appointments/`.

- `api.ts` — `listDoctorReviews(doctorId, page)`
- `hooks.ts` — `useDoctorReviews(doctorId, page)`
- `schemas.ts` — `Review`, `ReviewsResponse` types matching the server
- `components/ReviewList.tsx` — list of `ReviewItem` cards
- `components/ReviewItem.tsx` — single review (stars, comment, patient name initial + first name only for privacy, formatted date)
- `components/StarBar.tsx` — small visual rating bar (used by both list and detail)

Privacy note: the list returns `patientName` from the server, but the UI
should render only the first name + last initial ("Marisol C.") to avoid
exposing full names of patients. Format on the client. Don't change the API.

#### Modify: `DoctorDetailPage.tsx`

Add a "Reviews" section below the existing detail content:

- Header: average rating + review count (e.g. "★ 4.8 · 24 reviews")
- `ReviewList` with paginated controls (Previous / Next, same shape as appointment list)
- Empty state: "No reviews yet."
- Loading skeleton

Keep the page under 300 lines; if it overshoots, extract a `DoctorReviewsSection.tsx`.

#### Modify: `DoctorCard.tsx`

Add a small "Verified" check icon next to the doctor's name when
`doctor.isVerified` is true. Server-side filtering means unverified never
renders in the public list anyway, but the badge visually reinforces trust.

---

## Sitting 2 — Admin Surface

### Server: Admin bootstrap

Admins must not be self-registerable through `/api/auth/register` — that's
already enforced indirectly because the schema accepts patient/doctor only.
Don't change registration. Add a seed script instead.

#### New file: `server/src/db/seedAdmin.ts`

Idempotent CLI script:

```bash
bun run --filter server db:seed:admin -- --email=admin@hilom.local --password=...
```

- Reads `--email` and `--password` from argv (Zod-validated).
- If a user with that email exists and role is admin → log & exit 0.
- If exists but not admin → exit 1 with a clear error.
- Otherwise insert a row with `role: "admin"`, `passwordHash: bcrypt(password, 12)`, `emailVerifiedAt: now()` (admin emails are pre-verified).

Add to `server/package.json` scripts:

```json
"db:seed:admin": "tsx src/db/seedAdmin.ts"
```

This is the only path to creating an admin. Document it in README under "Setup".

---

### Server: Admin services + endpoints

#### New file: `server/src/middleware/adminGuard.ts`

```ts
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new AppError(401, "Authentication required"));
  if (req.user.role !== "admin") return next(new AppError(403, "Admin only"));
  next();
};
```

Used after `requireAuth`. Could collapse into existing `roleGuard("admin")`,
but a named middleware reads better at the route layer.

#### New file: `server/src/services/admin.service.ts`

Functions:

- `listUsers({ page, role?, search? })`:
  - Paginated, ordered by `createdAt DESC`. Filter by role and email/name `ilike`.
  - Returns `{ users: [{ id, email, fullName, role, emailVerifiedAt, createdAt }], total, page, pageSize }`.

- `listUnverifiedDoctors({ page })`:
  - Returns doctor profiles where `isVerified = false`, joined with users + specializations.
  - Same shape as `listUsers` but with profile data.

- `setDoctorVerified(doctorProfileId, isVerified)`:
  - Updates `doctor_profiles.is_verified`. 404 if missing.
  - Returns the updated row.

- `getPlatformStats()`:
  - Single query bundle: counts of users by role, appointments by status,
    sum of `payments.amount` where status = `released`, count of
    unverified doctors.
  - Returns:
    ```
    {
      users: { total, patients, doctors, admins },
      appointments: { total, pending, confirmed, completed, cancelled },
      revenue: { released, escrowed },
      doctors: { unverified },
    }
    ```

#### New file: `server/src/controllers/admin.controller.ts`

```ts
export const listUsers; // GET  /api/admin/users
export const listUnverifiedDoctors; // GET  /api/admin/doctors/unverified
export const verifyDoctor; // PATCH /api/admin/doctors/:id/verify  body: { isVerified: bool }
export const getPlatformStats; // GET  /api/admin/stats
```

Each: `requireAuth`, `requireAdmin`, validateRequest, asyncHandler.

#### New file: `server/src/routes/admin.routes.ts`

```ts
adminRouter.use(requireAuth, requireAdmin);
adminRouter.get("/users", asyncHandler(listUsers));
adminRouter.get("/doctors/unverified", asyncHandler(listUnverifiedDoctors));
adminRouter.patch("/doctors/:id/verify", asyncHandler(verifyDoctor));
adminRouter.get("/stats", asyncHandler(getPlatformStats));
```

Mount in `app.ts`: `app.use("/api/admin", adminRouter)`.

---

### Server Tests: `server/tests/admin.test.ts`

Helpers: register admin via direct DB insert (or expose a `registerAdmin`
test helper that mirrors the seed script).

1. **Non-admin gets 403 on every admin endpoint** — patient and doctor → 403.
2. **No auth → 401** — confirms middleware order.
3. **List users — paginated, role filter** — seed 5 patients, 2 doctors, 1 admin → list filtered by role works.
4. **List unverified doctors** — seed 2 verified + 1 unverified → endpoint returns 1.
5. **Verify a doctor → flips is_verified** — PATCH with `{ isVerified: true }` → 200; row updated; subsequent public list now includes that doctor.
6. **Reject a doctor → flips back to false** — PATCH with `{ isVerified: false }` → 200; row updated; public list excludes again.
7. **Verify on missing doctor → 404**.
8. **Stats endpoint returns correct shape** — assert keys present and counts match seeded data.
9. **Stats revenue.released equals sum of released payments** — seed two paid+completed appointments, one cancelled → revenue.released matches the two paid amounts.

(9 tests.)

---

### Client (Sitting 2)

#### New: `client/src/features/admin/`

```
features/admin/
  api.ts
  hooks.ts
  schemas.ts
  components/
    AdminSidebar.tsx
    StatTile.tsx
    UserRow.tsx
    UnverifiedDoctorRow.tsx
  pages/
    AdminStatsPage.tsx
    UserManagementPage.tsx
    DoctorVerificationPage.tsx
```

- `AdminSidebar` — vertical nav for `/admin`, `/admin/users`, `/admin/doctors`. On mobile, collapses to a horizontal scroll bar at the top.
- `StatTile` — single big-number tile (label + value + small subtitle).
- `AdminStatsPage` — grid of `StatTile`s populated from `/api/admin/stats`.
- `UserManagementPage` — paginated table-like list of users with role filter + search input (debounced 300ms).
- `DoctorVerificationPage` — paginated list of unverified doctors; each row has a "Verify" button. Click → PATCH → row removed from list (optimistic).

#### New: `client/src/components/layout/AdminLayout.tsx`

Wraps admin routes in a layout with the sidebar. Guards client-side via
`useAuth` — redirects non-admin users to `/dashboard`.

#### Modify: `routes.tsx`

```ts
<Route element={<AdminLayout />}>
  <Route path="/admin" element={<AdminStatsPage />} />
  <Route path="/admin/users" element={<UserManagementPage />} />
  <Route path="/admin/doctors" element={<DoctorVerificationPage />} />
</Route>
```

Inside the existing `<ProtectedRoute />`. Server-side guards are the source
of truth; client-side redirect is just UX.

#### Modify: `Navbar.tsx`

Add an "Admin" link (after "Payments") visible only when `user?.role === "admin"`.
The patient/doctor links (Appointments, Messages, Prescriptions, Payments) are
hidden for admins, who don't have those flows. Mobile menu mirrors the change.

---

## API Summary

| Method | Path                          | Auth   | Description                                |
| ------ | ----------------------------- | ------ | ------------------------------------------ |
| GET    | /api/doctors/:id/reviews      | public | Paginated list of a doctor's reviews       |
| GET    | /api/admin/users              | admin  | Paginated user list (role filter + search) |
| GET    | /api/admin/doctors/unverified | admin  | Paginated unverified doctors               |
| PATCH  | /api/admin/doctors/:id/verify | admin  | Flip `is_verified`                         |
| GET    | /api/admin/stats              | admin  | Counts + revenue snapshot                  |

---

## Commit Strategy (4 commits)

```
feat(reviews): add public reviews list endpoint and verified-only doctor list + 7 tests
feat(reviews): add reviews section on DoctorDetailPage and verified badge
feat(admin): add admin seed, verification + users + stats endpoints + 9 tests
feat(admin): add AdminLayout, stats/users/doctor-verification pages, Navbar wiring
```

---

## Implementation Notes

- **Why hide unverified doctors by default**: Today an unverified
  newly-registered doctor lands directly in the public listing — patients
  could book a doctor whose credentials nobody has reviewed. Flipping the
  filter to `is_verified = true` is the right default; the admin sitting
  gives a path to flip the flag.
- **Why admin via seed, not API**: Self-registration as admin would be a
  privilege-escalation primitive. The bar to add an admin should require
  shell access to the deployed environment. A CLI seed script makes that
  explicit.
- **Why patient-name privacy on review list**: Reviews are public; full
  patient names attached to medical visits is a leak. Server still owns the
  name (admin tooling needs it), the public list response can either
  truncate server-side ("Marisol C.") or the client formats. Doing it
  client-side keeps the API consistent across consumers; flag for a
  follow-up if compliance review wants it server-side.
- **Why one stats endpoint, not three**: Admin dashboard renders all
  numbers at once. A single query bundle is cheaper than three separate
  round-trips and the response is small. Phase 9 might split if any
  individual stat gets heavy.
- **Why `requireAdmin` not `roleGuard("admin")`**: Functionally equivalent.
  The name reads better at the route layer, and admin authorization is a
  cross-cutting concern that benefits from a single import path.
- **Why no `users.is_active` yet**: Suspension touches every "ownership"
  query in the codebase (do we hide suspended doctors from the public list?
  Cancel their appointments? What about their payments?). It's its own
  ticket, deferred to a backlog item with a proper rollout plan.
- **Line caps**: AdminStatsPage stays thin if `StatTile` does the
  presentation. UserManagementPage will need `UserRow` + a `UserSearchBar`
  extracted to stay under 150.
- **Mobile-first**: Admin lists are dense. On narrow screens, each row is a
  card with stacked fields; at `sm:` breakpoint it becomes a flex row.
- **No `as` / `any`**: Admin payloads come from Zod-derived types; user
  rows are typed via the service result, not narrowed from `unknown`.
- **DB index**: Consider an index on `reviews.doctor_id + created_at` for
  the per-doctor list endpoint. Add only if `EXPLAIN ANALYZE` shows a
  sequential scan past ~10k reviews per doctor — not a real risk yet.
