# Phase 7 — Payments

> **Prompt**: `do phase 7 ultrathink this`
>
> Act as a senior full-stack engineer. Read `docs/phase-7-plan.md` end to end,
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

Take money for an appointment and hold it until the visit happens, then release
it to the doctor. Cancel before completion → refund. PayMongo has no native
escrow, so we model hold/release in our own `payments` table and treat
PayMongo as a captured-once-and-credited charge.

The payment row is the single source of truth for the money. The PayMongo
intent is just the external charge that moves the cash; the lifecycle
(`pending → escrowed → released | refunded`) lives entirely in our DB.

## Scope

Two sittings. Server-first, then client.

| Sitting | Server                                                                                                                                                | Client                                                                        |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1       | Migration (unique on appointmentId, paidAt + refundedAt), PayMongo wrapper, payment service, mock-confirm + webhook, list/read endpoints, tests       | PaymentPage with "Pay now" button, booking flow redirects to it               |
| 2       | Hook payment lifecycle into appointment status transitions (release on complete, refund on cancel), expose `paymentStatus` on appointment rows, tests | MyPaymentsPage list, AppointmentCard payment badge + pay-now CTA, Navbar link |

Not in scope (backlog): real-card 3DS step-up, PayMongo Connected Accounts
(real escrow at the network level), partial refunds, refund reason codes,
chargebacks, payouts dashboard, payment receipts as PDF, manual admin-driven
release.

---

## Existing schema (one migration needed)

```
payments  — id, appointmentId, patientId, doctorId, amount, status,
            paymongoPaymentIntentId, createdAt, releasedAt
```

The table already exists in `db/schema.ts`. Two changes:

1. **Unique constraint on `appointmentId`** — one payment per appointment, race-safe at the DB layer.
2. **Add `paidAt` and `refundedAt`** so the lifecycle has explicit timestamps for each transition (we already have `createdAt` and `releasedAt`).

### Migration: schema additions

Modify `server/src/db/schema.ts`:

```ts
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  appointmentId: uuid("appointment_id")
    .references(() => appointments.id)
    .unique() // <-- add
    .notNull(),
  patientId: uuid("patient_id")
    .references(() => users.id)
    .notNull(),
  doctorId: uuid("doctor_id")
    .references(() => users.id)
    .notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  paymongoPaymentIntentId: varchar("paymongo_payment_intent_id", {
    length: 255,
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"), // <-- add
  releasedAt: timestamp("released_at"),
  refundedAt: timestamp("refunded_at"), // <-- add
});
```

Then `bun run --filter server db:generate` and `bun run --filter server db:push`.

---

## Sitting 1 — Payment Intent at Booking + Pay Page

### Server: PayMongo wrapper

#### New file: `server/src/services/paymongo.service.ts`

A thin wrapper around the PayMongo Payment Intent API. Has a clear two-mode
behavior so dev / test never need a real PayMongo key:

- **Stub mode** — when `PAYMONGO_SECRET_KEY` is empty (dev/test). Returns
  deterministic fake IDs (`pi_stub_<uuid>`) and a stub client key. No HTTP call.
- **Live mode** — when `PAYMONGO_SECRET_KEY` is set (prod). Calls
  `POST https://api.paymongo.com/v1/payment_intents` with Basic auth
  (`base64(secret:)`). Currency is `PHP`. Amount is sent in centavos
  (peso × 100). Allowed payment methods: `["gcash", "paymaya", "card"]`.

Exports:

```ts
export interface CreateIntentResult {
  intentId: string;   // pi_xxx
  clientKey: string;  // pi_xxx_client_xxx — sent to client to mount the SDK
  status: string;     // awaiting_payment_method | succeeded | ...
}

export const createPaymentIntent = async (
  amountCentavos: number,
  description: string,
): Promise<CreateIntentResult>;

export const retrievePaymentIntent = async (
  intentId: string,
): Promise<{ id: string; status: string }>;

export const refundPaymentIntent = async (
  intentId: string,
  amountCentavos: number,
): Promise<{ id: string; status: string }>;
```

The wrapper hides PayMongo's wire format (keys → attributes → status). Higher
layers only see `{ intentId, clientKey, status }`.

`isStubMode()` is exported so the controller can decide whether to expose the
mock-confirm endpoint.

---

### Server: Payment Service

#### New file: `server/src/services/payment.service.ts`

Functions:

- `createPaymentForAppointment({ appointmentId, patientId, doctorUserId, amount }, tx?)`:
  - Idempotent — if a payment for this `appointmentId` exists, return it.
  - Otherwise insert a row (`status: pending`), create a PayMongo intent for
    the amount, store `paymongoPaymentIntentId`, return `{ payment, clientKey }`.
  - Runs inside the booking transaction when called from `bookAppointment`.

- `confirmPayment(appointmentId, requestingUserId)`:
  - Look up payment by `appointmentId`; 404 if missing.
  - Authorize: `requestingUserId === payment.patientId` (403 otherwise).
  - If already `escrowed | released | refunded` → return as-is (idempotent).
  - Verify with PayMongo (in live mode) that the intent is `succeeded`; in stub
    mode skip verification.
  - Update `status = "escrowed"`, set `paidAt = now()`. Return updated row.

- `releaseEscrow(appointmentId, tx?)`:
  - Called from `appointment.service.updateAppointmentStatus` when transitioning
    to `completed`. No-op if payment is missing or not in `escrowed`.
  - `escrowed → released`, set `releasedAt = now()`.

- `refundPayment(appointmentId, tx?)`:
  - Called from `appointment.service.updateAppointmentStatus` when
    transitioning to `cancelled`. No-op if payment is missing.
  - `pending` → `refunded` (no PayMongo refund call — never charged). Just close out.
  - `escrowed | released` → call `paymongo.refundPaymentIntent`, mark
    `refunded`, set `refundedAt = now()`.
  - Already `refunded` → no-op.

- `getPaymentByAppointment(appointmentId, userId)`:
  - 404 if missing. Authorize as patient or doctor of the appointment (403 otherwise).
  - Return shape: `{ id, appointmentId, status, amount, paidAt, releasedAt, refundedAt, createdAt }`.

- `listMyPayments(userId, role)`:
  - Patients: `WHERE patientId = userId`. Doctors: `WHERE doctorId = userId`.
  - Order by `createdAt DESC`. Includes other-party name + appointment date.

- `handleWebhook(rawBody, signatureHeader)`:
  - Verify the PayMongo signature (HMAC-SHA256 over the raw body using
    `PAYMONGO_WEBHOOK_SECRET`). 400 on mismatch.
  - For event `payment.paid`: extract `payment_intent_id` from payload, find
    our payment row by `paymongoPaymentIntentId`, mark `escrowed` if currently `pending`.
  - Idempotent — replays of the same event are no-ops.

The unique constraint on `appointmentId` is the source of truth for "one
payment per appointment." Catch the unique-violation on insert and treat it as
"already created" rather than racing.

---

### Server: Hook into booking flow

#### Modify: `server/src/services/appointment.service.ts → bookAppointment`

After inserting the appointment inside the existing transaction:

```ts
const profile = await tx.query.doctorProfiles.findFirst({
  where: eq(doctorProfiles.id, input.doctorId),
});
// profile is already guaranteed non-null upstream

const { payment, clientKey } = await createPaymentForAppointment(
  {
    appointmentId: inserted.id,
    patientId,
    doctorUserId: profile.userId,
    amount: profile.consultationFee,
  },
  tx,
);

return { appointment: inserted, payment, clientKey };
```

The booking response now includes `{ appointment, payment, clientKey }`. The
client redirects the patient to `/payments/:appointmentId` to complete payment.

The booking can succeed even if the PayMongo call fails — but then the patient
can never pay. Two options:

- **Fail the whole booking** (chosen): rollback the tx. Patient retries; the
  slot is released. Better UX than a stranded appointment they can't pay for.
- ~~Book anyway, surface the error~~: leaves stranded rows. Reject.

If PayMongo is in stub mode, this never fails.

---

### Server: Controller + Routes

#### New file: `server/src/controllers/payment.controller.ts`

```ts
export const confirmPaymentMock; // POST /api/appointments/:id/payment/confirm  (dev only — stub mode)
export const getPayment; // GET  /api/appointments/:id/payment
export const listMyPayments; // GET  /api/payments
export const paymongoWebhook; // POST /api/payments/webhook  (no auth)
```

`confirmPaymentMock`:

- `requireAuth`. Patient-only via in-controller role check (matches existing
  controller style — `roleGuard("patient")` would also work).
- Returns 404 unless `paymongo.isStubMode()` — keeps the dev shortcut from
  shipping to prod.
- Calls `confirmPayment(req.params.id, req.user.id)`.

`getPayment` / `listMyPayments`: standard `requireAuth` + service call.

`paymongoWebhook`:

- Mounted with `express.raw({ type: "application/json" })` so the HMAC
  signature can be verified against the unparsed body.
- Always returns 200 on signature mismatch in dev (logs warning); strict 400 in
  prod. PayMongo retries non-2xx, so swallowing 400s in dev avoids local noise.

#### New file: `server/src/routes/payment.routes.ts`

```ts
// Nested under appointments router (mock-confirm + read):
appointmentRouter.post(
  "/:id/payment/confirm",
  requireAuth,
  asyncHandler(confirmPaymentMock),
);
appointmentRouter.get("/:id/payment", requireAuth, asyncHandler(getPayment));

// Standalone payments router:
paymentRouter.get("/", requireAuth, asyncHandler(listMyPayments));
paymentRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  asyncHandler(paymongoWebhook),
);
```

Mount in `app.ts`: `app.use("/api/payments", paymentRouter)`.

---

### Server Tests: `server/tests/payment.test.ts`

Stub mode is on for the test env (no `PAYMONGO_SECRET_KEY`). All cases run
without external calls.

1. **Booking creates a payment row** — POST `/api/appointments` returns `{ appointment, payment, clientKey }`; payment.status === `"pending"`; amount matches doctor's fee.
2. **One payment per appointment** — second booking attempt for the same slot is rejected by the existing slot-unique guard (sanity check, not new logic).
3. **Patient confirms payment (mock)** — POST `/api/appointments/:id/payment/confirm` → 200; payment.status === `"escrowed"`; `paidAt` set.
4. **Confirm is idempotent** — calling confirm twice → still `escrowed`, no DB error.
5. **Non-owner cannot confirm** — different patient → 403.
6. **Doctor cannot confirm** — patient's payment, doctor calls confirm → 403.
7. **Patient and doctor of appt can read payment** — both GET return 200.
8. **Stranger cannot read** — third-party patient → 403.
9. **404 when payment doesn't exist for appointment** — sanity (cancelled-then-re-booked edge later, but for now: appointment without a payment row is unreachable).
10. **Patient list scope** — patient sees own payments only.
11. **Doctor list scope** — doctor sees payments to them only.
12. **Webhook signature mismatch** — POST `/api/payments/webhook` with bad signature → 400.

(12 server tests for sitting 1.)

---

### Client (Sitting 1)

#### New: `client/src/features/payments/schemas.ts`

```ts
export type PaymentStatus = "pending" | "escrowed" | "released" | "refunded";

export interface Payment {
  id: string;
  appointmentId: string;
  status: PaymentStatus;
  amount: string; // decimal as string from PG; format with formatCurrency
  paidAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
  createdAt: string;
}

export interface PaymentListItem extends Payment {
  otherPartyName: string;
  appointmentDate: string;
}

export interface BookingResponse {
  appointment: Appointment;
  payment: Payment;
  clientKey: string;
}
```

#### New: `client/src/features/payments/api.ts`

```ts
export const getPayment = async (appointmentId: string): Promise<Payment>;
export const confirmPaymentMock = async (appointmentId: string): Promise<Payment>;
export const listMyPayments = async (): Promise<PaymentListItem[]>;
```

#### New: `client/src/features/payments/hooks.ts`

```ts
export const paymentByAppointmentKey = (id: string) =>
  ["payment", id] as const;
export const paymentListKey = ["payments"] as const;

export const usePaymentByAppointment = (id: string | undefined) =>
  useQuery({ enabled: Boolean(id), queryKey: ..., queryFn: ..., retry: false });

export const useConfirmPaymentMock = (appointmentId: string) =>
  useMutation({
    mutationFn: () => confirmPaymentMock(appointmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: paymentByAppointmentKey(appointmentId) });
      qc.invalidateQueries({ queryKey: paymentListKey });
      qc.invalidateQueries({ queryKey: ["myAppointments"] });
    },
  });

export const useMyPayments = () =>
  useQuery({ queryKey: paymentListKey, queryFn: listMyPayments, staleTime: 30_000 });
```

#### New: `client/src/features/payments/pages/PaymentPage.tsx`

Route: `/payments/:appointmentId`

Layout (mobile-first):

- Header: doctor name, appointment date/time, back to /appointments
- Amount block: `formatCurrency(amount)` in PHP, large bold
- Method selector (cosmetic — gcash | maya | card buttons that are radio-style)
  No real method routing in this phase; selection is recorded in local state
  and ignored on submit.
- Status block:
  - `pending` → "Pay now" button. In stub mode, this calls `confirmPaymentMock`. (No real PayMongo redirect in dev.)
  - `escrowed` → "Paid — held until appointment completes" + back link
  - `released` → "Released to doctor" + back link
  - `refunded` → "Refunded" + back link
- Toast on success → navigate `/appointments`

If the page itself crosses 150 lines (likely), extract:

- `PaymentStatusCard.tsx` — status block with copy by state
- `PaymentMethodSelector.tsx` — the three radio buttons

#### Modify: `BookingModal.tsx`

After successful booking, instead of `navigate("/appointments")` → `navigate('/payments/' + appointment.id)`. The patient is taken straight to the pay page.

Keep the existing 409 conflict handling.

#### Routes: add to `routes.tsx`

- `/payments/:appointmentId` — PaymentPage (patient — accessible by doctor too for read, but UI only shows pay button if patient and pending)

---

## Sitting 2 — Auto-release, Auto-refund, Payment History

### Server

#### Modify: `server/src/services/appointment.service.ts → updateAppointmentStatus`

After the status update succeeds and the existing chat-conversation hook on `confirmed`:

```ts
if (newStatus === "completed") {
  await releaseEscrow(appointmentId);
}
if (newStatus === "cancelled") {
  await refundPayment(appointmentId);
}
```

Both helpers are no-ops on missing or already-final payments, so they're safe
to call unconditionally on those transitions.

**Important**: Doctor cannot complete an appointment whose payment isn't
`escrowed`. If patient never paid and doctor tries `confirmed → completed`,
the transition is rejected with 409 `Cannot complete an unpaid appointment`.
Without this, the doctor could "complete" a free visit. Add an explicit
guard in the `completed` branch before flipping the status.

#### Modify: appointment list rows expose `paymentStatus`

`listPatientAppointments` and `listDoctorAppointments` already left-join other
artifacts. Add a `LEFT JOIN payments` and surface `paymentStatus` on each row.
The client uses this for badges + "Pay now" CTA on the card.

```ts
.leftJoin(payments, eq(payments.appointmentId, appointments.id))
// select: paymentStatus: payments.status
```

Update `AppointmentRow` and `DoctorAppointmentRow` interfaces with
`paymentStatus: PaymentStatus | null`.

---

### Server Tests (add to `payment.test.ts`):

13. **Completing a paid appointment releases the payment** — confirm → pay → complete → payment.status === `"released"`, `releasedAt` set.
14. **Cancelling a paid appointment refunds it** — confirm → pay → cancel → `"refunded"`, `refundedAt` set.
15. **Cancelling a pending (unpaid) appointment closes payment as refunded with no PayMongo call** — book (no pay) → cancel → `"refunded"`. Patient was never charged; row is closed out.
16. **Doctor cannot complete an unpaid appointment** — confirm → (no pay) → doctor tries `completed` → 409.
17. **Appointment list exposes paymentStatus** — patient list rows have `paymentStatus` matching DB; null only when no payment row exists.

(5 more — 17 total for Phase 7.)

---

### Client (Sitting 2)

#### New: `client/src/features/payments/pages/MyPaymentsPage.tsx`

Route: `/payments`

- List of payment cards
- Each shows: other-party name, appointment date, amount (`formatCurrency`),
  status badge (color-coded), `formatDate(createdAt)`
- Click → `/payments/:appointmentId`
- Empty state: "No payments yet."
- Same `useMyPayments` hook for both roles; copy adapts ("Payments you've
  received" for doctor, "Your payments" for patient)

#### New: `client/src/features/payments/components/PaymentStatusBadge.tsx`

Reusable badge with color by status:

- `pending` — amber
- `escrowed` — blue
- `released` — green
- `refunded` — muted

#### Modify: `AppointmentCard.tsx`

For each appointment, read `paymentStatus`:

- `paymentStatus === "pending"` (any active appt) → show **"Pay now"** LinkButton → `/payments/:id`
- `paymentStatus === "escrowed"` → show "Paid" badge
- `paymentStatus === "released"` → show "Released" badge (only on completed)
- `paymentStatus === "refunded"` → show "Refunded" badge (only on cancelled)

Pay-now CTA takes priority over the existing "Cancel" / "Chat" buttons when
both apply — payment is the blocker.

#### Modify: `Navbar`

- Add a "Payments" link (after "Prescriptions") → `/payments`
- No badge — payment counts aren't a notification primitive in this phase

#### Routes: add to `routes.tsx`

- `/payments` — MyPaymentsPage

---

## API Summary

| Method | Path                                  | Auth                      | Description                             |
| ------ | ------------------------------------- | ------------------------- | --------------------------------------- |
| POST   | /api/appointments/:id/payment/confirm | patient (owner)           | Mock-confirm payment in stub mode (dev) |
| GET    | /api/appointments/:id/payment         | patient or doctor of appt | Read payment                            |
| GET    | /api/payments                         | any                       | List caller's payments (role-scoped)    |
| POST   | /api/payments/webhook                 | none (HMAC verified)      | PayMongo `payment.paid` webhook         |

---

## Commit Strategy (4 commits)

```
feat(payments): add unique constraint, paymongo wrapper, payment service + 12 tests
feat(payments): wire payment intent into booking flow and add PaymentPage
feat(payments): release on complete, refund on cancel, paymentStatus on appts + 5 tests
feat(payments): add payments history page, AppointmentCard wiring, Navbar link
```

---

## Implementation Notes

- **Why unique-on-DB instead of service-level check**: A retried booking
  request — same patient, same slot, network blip — can land twice. The
  unique constraint on `appointmentId` guarantees we never charge twice for the
  same appointment. Service-level "find then insert" is racy; idempotency is the constraint.
- **Why a transaction around booking + payment-intent creation**: The
  appointment row and the payment row must exist together. Creating the
  appointment then failing to create the payment leaves an orphaned booking
  the patient can't pay for (and can't cancel without a refund cycle). Keep
  them atomic.
- **Why PayMongo lives behind a stub in dev**: The redirect-to-e-wallet step
  can't be exercised on localhost, and a real test secret key isn't worth the
  setup churn for a portfolio project. The stub returns the same shape as the
  real wrapper, so swapping `PAYMONGO_SECRET_KEY` from empty to a live value
  is the only thing required to flip dev → prod. Phase 11 backlog item
  promotes this to real PayMongo for the demo.
- **Why a mock-confirm endpoint instead of just calling the service**: Keeps
  the patient's flow honest: same auth, same authorization, same query
  invalidations. The endpoint is gated on stub mode so it's not a prod attack
  surface.
- **Why webhook signature verification matters even in dev**: It's the one
  piece of payment code that's hardest to retrofit safely. Build it now;
  the test for signature mismatch locks the contract in.
- **Why "doctor cannot complete unpaid"**: Without this, a doctor could mark
  an appointment "completed" and the system would try to release a
  non-escrowed payment (no-op). The doctor would think they got paid; the
  patient was never charged. Block the transition explicitly.
- **Why no real refund call in stub mode**: PayMongo refunds need a real
  charge. In stub mode, we simulate the state transition only. The
  `paymongo.service` call is wrapped in a stub-mode guard.
- **Why immutable payments after final state**: Once `released` or
  `refunded`, the row never moves again. The transitions are one-way. This
  matches how money actually behaves and avoids audit-log retrofits.
- **Why a separate page, not a modal**: Real-life payment requires a redirect
  in production; a page makes the redirect-and-return cycle natural.
  In stub mode it's a single button, but the route already exists for prod.
- **Why payment list before payment detail**: A user landing on `/payments`
  in the middle of any flow needs to see status at a glance. The
  per-appointment page is one click away. Same shape as `/prescriptions`.
- **Line caps**: PaymentPage will need `PaymentStatusCard` extracted.
  MyPaymentsPage stays thin if `PaymentStatusBadge` carries the formatting.
- **Mobile-first**: Pay button is full-width below 640px; method buttons
  stack vertically on narrow viewports.
- **No `as` / `any`**: Stub-mode IDs are typed via `CreateIntentResult`;
  webhook payload is parsed through Zod (no `as` casts).
- **DB index**: Consider an index on `payments.patientId` and
  `payments.doctorId` for the list endpoint. Add only if `EXPLAIN ANALYZE`
  shows a sequential scan past ~10k rows — not worth pre-optimizing.
