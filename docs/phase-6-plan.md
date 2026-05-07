# Phase 6 — Prescriptions

> **Prompt**: `do phase 6 ultrathink this`
>
> Act as a senior full-stack engineer. Read `docs/phase-6-plan.md` end to end,
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

Let a doctor issue a prescription for a completed appointment, with one or more
medications, and let the patient view it. A prescription is a single, immutable
artifact attached one-to-one to an appointment — write once, read forever.

## Scope

Two sittings. Server-first, then client.

| Sitting | Server                                                               | Client                                                            |
| ------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1       | Migration (unique on appointmentId), schemas, service, routes, tests | WritePrescriptionPage with dynamic medication rows                |
| 2       | List endpoint (patient + doctor scoped), socket event on issue       | View page, patient list page, AppointmentCard wiring, Navbar link |

Not in scope (backlog): edit/revoke prescriptions, PDF export, e-signature,
PRC license overlay, drug-interaction checks, refill flows, attachments.

---

## Existing schema (one migration needed)

```
prescriptions             — id, appointmentId, doctorId, patientId, notes, createdAt
prescription_medications  — id, prescriptionId, medicationName, dosage, frequency, duration, instructions
```

Both tables already exist in `db/schema.ts`. The only change is adding a
`unique` constraint on `prescriptions.appointmentId` so the "one prescription
per appointment" rule is enforced in the database, not just the service.

### Migration: add unique constraint

Modify `server/src/db/schema.ts`:

```ts
export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  appointmentId: uuid("appointment_id")
    .references(() => appointments.id)
    .unique() // <-- add this
    .notNull(),
  // ...rest unchanged
});
```

Then `bun run --filter server db:generate` and `bun run --filter server db:migrate`.

---

## Sitting 1 — Prescription API + Write Page

### Server: Schemas

#### New file: `server/src/schemas/prescription.schema.ts`

```ts
import { z } from "zod";

export const medicationInputSchema = z.object({
  medicationName: z.string().trim().min(1).max(255),
  dosage: z.string().trim().min(1).max(100),
  frequency: z.string().trim().min(1).max(100),
  duration: z.string().trim().min(1).max(100),
  instructions: z.string().trim().max(2000).optional(),
});

export const writePrescriptionSchema = z.object({
  notes: z.string().trim().max(4000).optional(),
  medications: z
    .array(medicationInputSchema)
    .min(1, "At least one medication required")
    .max(20),
});

export type WritePrescriptionInput = z.infer<typeof writePrescriptionSchema>;
export type MedicationInput = z.infer<typeof medicationInputSchema>;
```

---

### Server: Prescription Service

#### New file: `server/src/services/prescription.service.ts`

Functions:

- `writePrescription(appointmentId, doctorUserId, input)`:
  - Look up appointment; 404 if missing
  - Verify the requesting doctor's `doctorProfiles.userId` matches `appointment.doctorId`'s profile (403 otherwise)
  - Verify `appointment.status === "completed"` (409 otherwise — `Prescription requires a completed appointment`)
  - Open a transaction:
    - Insert `prescriptions` row (rely on the unique constraint on `appointmentId`; on conflict throw 409 `Prescription already exists for this appointment`)
    - Insert all `prescription_medications` rows in one batch
    - Return prescription with medications
  - After commit, emit `prescription:new` socket event to the patient's user room (carries `{ appointmentId, prescriptionId }`)

- `getPrescriptionByAppointment(appointmentId, userId)`:
  - Look up prescription joined with medications
  - 404 if not found
  - Authorize: `userId === prescription.patientId || userId === prescription.doctorId` (403 otherwise)
  - Return shape: `{ id, appointmentId, notes, createdAt, doctorName, patientName, medications: [...] }`

- `listMyPrescriptions(userId, role)`:
  - For patients: `WHERE patientId = userId`
  - For doctors: `WHERE doctorId = userId`
  - Order by `createdAt DESC`
  - Returns rows with medication count + appointment date for the list view (no medications array — keep payload small)

The unique constraint is the source of truth for "one per appointment". Catch
the Postgres unique-violation on insert and translate it to `AppError(409,
"Prescription already exists for this appointment")` rather than racing a
"check then insert".

---

### Server: Prescription Controller + Routes

#### New file: `server/src/controllers/prescription.controller.ts`

```ts
export const writePrescription; // POST /api/appointments/:id/prescription
export const getPrescription; // GET  /api/appointments/:id/prescription
export const listMyPrescriptions; // GET  /api/prescriptions
```

`writePrescription`:

- `requireAuth` + `roleGuard("doctor")`
- `validateRequest(writePrescriptionSchema)`
- Calls `writePrescription` service with `req.params.id`, `req.user.id`, `req.body`
- Returns 201 with the created prescription + medications

`getPrescription`:

- `requireAuth` (any role allowed — service authorizes)
- Calls `getPrescriptionByAppointment` with `req.params.id`, `req.user.id`
- Returns 200 with full prescription + medications

`listMyPrescriptions`:

- `requireAuth`
- Calls `listMyPrescriptions(req.user.id, req.user.role)`
- Returns 200 with `{ prescriptions: [...] }`

#### New file: `server/src/routes/prescription.routes.ts`

```ts
// Nested under the appointments router:
appointmentRouter.post(
  "/:id/prescription",
  requireAuth,
  roleGuard("doctor"),
  validateRequest(writePrescriptionSchema),
  asyncHandler(writePrescription),
);
appointmentRouter.get(
  "/:id/prescription",
  requireAuth,
  asyncHandler(getPrescription),
);

// Standalone prescriptions router:
prescriptionRouter.get("/", requireAuth, asyncHandler(listMyPrescriptions));
```

Mount in `app.ts`: `app.use("/api/prescriptions", prescriptionRouter)`.

---

### Server Tests: `server/tests/prescription.test.ts`

Setup: book → confirm → complete (or seed an appointment in `completed` state).

1. **Doctor writes prescription on completed appt** — 201, returns prescription with medications
2. **Doctor cannot write before completion** — appointment is `confirmed` → 409 (`requires a completed appointment`)
3. **Doctor cannot write twice for same appt** — second POST → 409 (`already exists`); DB still has exactly one row
4. **Different doctor (not the appointment's doctor) cannot write** — 403
5. **Patient cannot write** — 403 (`roleGuard("doctor")`)
6. **Empty medications array rejected** — 400 (Zod `min(1)`)
7. **Required medication fields enforced** — missing `dosage` → 400
8. **Patient + doctor of appt can read** — both GET return 200 with full payload
9. **Other patient/doctor cannot read** — 403
10. **404 when no prescription yet** — completed appt with no prescription → 404
11. **Patient list scope** — patient sees own prescriptions, not others'
12. **Doctor list scope** — doctor sees prescriptions they wrote, not others'

(12 tests on top of Phase 5's 11. Reasonable coverage.)

---

### Client (Sitting 1)

#### New: `client/src/features/prescriptions/schemas.ts`

```ts
export interface Medication {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  notes: string | null;
  createdAt: string;
  doctorName: string;
  patientName: string;
  medications: Medication[];
}

export interface PrescriptionListItem {
  id: string;
  appointmentId: string;
  appointmentDate: string;
  otherPartyName: string;
  medicationCount: number;
  createdAt: string;
}

// Form schema mirrors the server's writePrescriptionSchema
export const medicationFormSchema = z.object({
  /* … */
});
export const writePrescriptionFormSchema = z.object({
  notes: z.string().trim().max(4000).optional(),
  medications: z.array(medicationFormSchema).min(1).max(20),
});
```

#### New: `client/src/features/prescriptions/api.ts`

```ts
export const writePrescription = async (
  appointmentId: string,
  body: WritePrescriptionInput,
): Promise<Prescription>;

export const getPrescription = async (
  appointmentId: string,
): Promise<Prescription>;

export const listMyPrescriptions = async (): Promise<PrescriptionListItem[]>;
```

#### New: `client/src/features/prescriptions/hooks.ts`

```ts
export const prescriptionByAppointmentKey = (id: string) =>
  ["prescription", id] as const;
export const prescriptionListKey = ["prescriptions"] as const;

export const usePrescriptionByAppointment = (id: string | undefined) =>
  useQuery({ enabled: Boolean(id), queryKey: ..., queryFn: ..., retry: false });

export const useWritePrescription = (appointmentId: string) =>
  useMutation({
    mutationFn: (body) => writePrescription(appointmentId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: prescriptionByAppointmentKey(appointmentId) });
      qc.invalidateQueries({ queryKey: prescriptionListKey });
      // also invalidate the appointment list so the "Has prescription" flag refreshes
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

export const useMyPrescriptions = () =>
  useQuery({ queryKey: prescriptionListKey, queryFn: listMyPrescriptions, staleTime: 30_000 });
```

#### New: `client/src/features/prescriptions/pages/WritePrescriptionPage.tsx`

Route: `/appointments/:id/prescription/new` (doctor only — guard via role check
in `ProtectedRoute` or in-page redirect).

Layout (mobile-first):

- Header: patient name, appointment date/time, back button
- Notes textarea (optional, 4000 chars)
- "Medications" section
  - One row per medication: `medicationName`, `dosage`, `frequency`, `duration`, `instructions`
  - "Remove" button on each row (disabled when only one row remains)
  - "+ Add medication" button at the bottom (max 20)
- Submit button: "Issue prescription" — disabled while pending
- After success → navigate to the view page

Form state: `react-hook-form` with `useFieldArray` for the medications list,
matching the existing client convention. Zod resolver from `writePrescriptionFormSchema`.

If the page itself crosses 150 lines (likely), extract:

- `MedicationRow.tsx` — single row of inputs
- `MedicationFieldArray.tsx` — the list + add/remove logic

#### Modify: `AppointmentCard.tsx`

For `status === "completed"`:

- Doctor: show "Issue prescription" link → `/appointments/:id/prescription/new` (only if no prescription yet — read `hasPrescription` flag, see below)
- Both: show "View prescription" link → `/appointments/:id/prescription` (only if `hasPrescription`)

The card needs a `hasPrescription` boolean from the appointment list response.
Add a `LEFT JOIN prescriptions` on `appointmentId` in
`listPatientAppointments` and `listDoctorAppointments` (mirror of how
`hasReview` already works).

#### Routes: add to `routes.tsx`

- `/appointments/:id/prescription/new` — WritePrescriptionPage (doctor)
- `/appointments/:id/prescription` — ViewPrescriptionPage (both — see Sitting 2)
- `/prescriptions` — MyPrescriptionsPage (both — see Sitting 2)

---

## Sitting 2 — View Page, List Page, Real-Time Notification

### Server

#### Add to `prescription.service.ts`:

(Already covered above — `listMyPrescriptions` and the `prescription:new` socket
emit. If split across sittings, defer the emit to Sitting 2.)

#### Add to `socket/index.ts` event registry (documentation comment only):

| Event              | Direction       | Payload                             | Description                  |
| ------------------ | --------------- | ----------------------------------- | ---------------------------- |
| `prescription:new` | Server → Client | `{ appointmentId, prescriptionId }` | Doctor issued a prescription |

---

### Server Tests (add to `prescription.test.ts`):

13. **Socket event on issue** — doctor POSTs prescription → patient's socket receives `prescription:new` with `{ appointmentId, prescriptionId }`

---

### Client (Sitting 2)

#### New: `client/src/features/prescriptions/pages/ViewPrescriptionPage.tsx`

Route: `/appointments/:id/prescription`

- Header: doctor name, patient name, issue date (`formatDate`), appointment date
- Notes block (if present)
- Medication list — one card per medication, mobile-stackable
  - Each card: name (heading), dosage + frequency + duration row, instructions block (if present)
- 404 fallback: "No prescription issued yet."

Read-only. No edit affordance (Phase 6 is write-once).

#### New: `client/src/features/prescriptions/pages/MyPrescriptionsPage.tsx`

Route: `/prescriptions`

- List of prescription cards
- Each shows: other-party name, appointment date, medication count, issue date
- Click → navigate to `/appointments/:appointmentId/prescription`
- Empty state: "No prescriptions yet."
- Same `useMyPrescriptions` hook for both roles; copy adapts to role
  ("Prescriptions you've issued" for doctor, "Your prescriptions" for patient)

#### New: `client/src/features/prescriptions/components/MedicationCard.tsx`

Reusable card used by `ViewPrescriptionPage`. Keeps the page under 150 lines.

#### Modify: `client/src/features/prescriptions/hooks.ts`

Add a socket listener (mirror of `useChatSocket`):

```ts
export const usePrescriptionSocket = (): void => {
  // listen for "prescription:new" → invalidate prescriptionListKey + the
  // matching appointment list so the AppointmentCard updates
};
```

Wire it up where `useChatSocket` is currently mounted (likely `AppLayout` or a
top-level provider) so it runs alongside the chat socket.

#### Modify: Navbar

- Add a "Prescriptions" link (after "Messages") → `/prescriptions`
- No badge for now — prescriptions don't have an unread concept

---

## API Summary

| Method | Path                               | Auth                          | Description                               |
| ------ | ---------------------------------- | ----------------------------- | ----------------------------------------- |
| POST   | /api/appointments/:id/prescription | doctor (must own appointment) | Issue prescription on completed appt      |
| GET    | /api/appointments/:id/prescription | patient or doctor of appt     | Read prescription                         |
| GET    | /api/prescriptions                 | any                           | List caller's prescriptions (role-scoped) |

---

## Commit Strategy (4 commits)

```
feat(prescription): add unique constraint, write/read service + 12 tests
feat(prescription): add write page with dynamic medication rows
feat(prescription): add view page, patient/doctor list, AppointmentCard wiring
feat(prescription): emit prescription:new socket event + client cache wiring
```

---

## Implementation Notes

- **Why unique-on-DB instead of service-level check**: Two doctors clicking
  "Issue" at the same time would both pass a service-level `findFirst` and both
  insert. The unique constraint is the only race-safe guarantee. Service-level
  check is OK as a UX 409, but the constraint must exist.
- **Why a transaction**: Prescription parent + medications must be atomic. A
  prescription with zero medications is semantically broken even though the
  schema allows it.
- **Why immutable in Phase 6**: Real prescriptions in PH would require an
  audit log + e-sig + PRC license. None of that lands here. Allowing edits now
  would create an audit gap that's hard to retrofit. Defer to backlog with
  proper audit-table design.
- **Why a page, not a modal**: Dynamic field array (1–20 rows) on mobile is
  miserable inside a modal. A full page also makes the form feel official,
  which matches the artifact's weight.
- **Why `hasPrescription` flag on the appointment list**: Avoids N+1 queries
  on render and lets `AppointmentCard` decide between "Issue" / "View" without
  a per-card fetch. Same pattern as `hasReview`.
- **Why a socket event**: Patient is likely on the appointments page when the
  doctor issues; cache invalidation flips the card from "completed" to
  "completed + has prescription" without a manual refresh. One-line emit, big
  UX win.
- **Line caps**: WritePrescriptionPage will need `MedicationRow` and
  `MedicationFieldArray` extracted. ViewPrescriptionPage will need
  `MedicationCard` extracted. Plan for it from the start, not after the cap is
  hit.
- **Mobile-first**: Medication rows stack vertically on small screens (each
  field on its own line); switch to a grid at `sm:` breakpoint.
- **No `as` / `any`**: Form types come from `z.infer<typeof
writePrescriptionFormSchema>`. The `useFieldArray` typing flows from there.
- **DB index**: Consider an index on `prescriptions.patientId` and
  `prescriptions.doctorId` for the list endpoint. Add only if `EXPLAIN ANALYZE`
  shows a sequential scan past ~10k rows — not worth pre-optimizing.
