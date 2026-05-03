# Phase 4 — Appointments & Reviews

## Goal

Close the booking loop opened in Phase 3. A patient picks a slot on a doctor's detail
page → books it → doctor confirms → doctor marks complete → patient leaves a review.
Ratings on doctor cards become live data instead of placeholders.

## Scope

Three sittings. Each sitting is server-first (endpoints + tests), then client.

| Sitting | Server                                                  | Client                                            |
| ------- | ------------------------------------------------------- | ------------------------------------------------- |
| 1       | Book appointment + list patient appointments            | BookingModal, /appointments page                  |
| 2       | Doctor appointment management (confirm/complete/cancel) | /my-appointments page, dashboard next-appointment |
| 3       | Reviews + averageRating recalc                          | ReviewModal, star display on doctor cards         |

Not in scope (Phase 5): payments (PayMongo), real-time chat (Socket.io), prescriptions,
Google OAuth.

---

## Existing schema (no migrations needed for sittings 1–3)

```
appointments  — patientId, doctorId, appointmentDate (date), slotStart (time),
                slotEnd (time), status enum(pending|confirmed|completed|cancelled),
                reason (text), notes (text)

reviews       — appointmentId (unique), patientId, doctorId, rating (int), comment (text)
                → unique constraint on appointmentId prevents double-reviews
```

`doctor_profiles.averageRating` is already a decimal column; we update it on every
review insert/delete inside a transaction.

---

## Sitting 1 — Booking API + Patient List

### Server

#### New file: `server/src/schemas/appointment.schema.ts`

```ts
export const bookAppointmentSchema = z.object({
  doctorId: z.string().uuid("Invalid doctor ID"),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  slotStart: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm format"),
  slotEnd: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm format"),
  reason: z.string().max(500).optional(),
});

export const listAppointmentsQuerySchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  page: z.coerce.number().int().positive().default(1),
});

export const APPOINTMENT_PAGE_SIZE = 10;
```

#### New file: `server/src/services/appointment.service.ts`

Functions:

- `bookAppointment(patientId, input)` — validates slot, inserts, returns appointment
- `listPatientAppointments(patientId, query)` — paginated, joins doctor name + spec
- `findAppointmentById(id)` — returns full appointment with patient + doctor info

Slot availability check inside `bookAppointment`:

1. Verify doctor profile exists and is active.
2. Verify date is not past and ≤ today+30 (reuse `todayInManila`, `addDaysToManilaDate`).
3. Call `generateSlots(...)` (imported from `slot.service`) to get available slots.
4. Check the requested `slotStart`/`slotEnd` pair appears in that list.
5. If not available → `throw new AppError(409, "Slot is no longer available")`.
6. Insert the appointment inside `db.transaction()`.
   - Re-query active appointments for (doctorId, appointmentDate) inside the tx before
     inserting to reduce race-condition window. If the slot is taken, throw 409.

Why re-check inside tx: two concurrent requests can both pass the generateSlots check.
Inside the transaction we do a final count query:

```ts
const conflict = await tx.query.appointments.findFirst({
  where: and(
    eq(appointments.doctorId, input.doctorId),
    eq(appointments.appointmentDate, input.appointmentDate),
    eq(appointments.slotStart, input.slotStart + ":00"), // DB stores HH:MM:SS
    inArray(appointments.status, ["pending", "confirmed"]),
  ),
});
if (conflict) throw new AppError(409, "Slot is no longer available");
```

#### New file: `server/src/controllers/appointment.controller.ts`

```ts
export const bookAppointment; // POST /api/appointments
export const listMyAppointments; // GET /api/me/appointments (patient)
```

`bookAppointment`:

- Requires auth; patient role only → `if (req.user.role !== "patient") throw new AppError(403, ...)`
- Parse body with `bookAppointmentSchema`
- Call `bookAppointment(req.user.id, parsed)`
- `res.status(201).json({ success: true, data: { appointment } })`

`listMyAppointments`:

- Requires auth; patient role
- Parse query with `listAppointmentsQuerySchema`
- Call `listPatientAppointments(req.user.id, query)`
- `res.json({ success: true, data: result })` // { appointments, total, page, pageSize }

#### Route wiring: new `server/src/routes/appointment.routes.ts`

```ts
appointmentRouter.post("/", requireAuth, asyncHandler(bookAppointment));
appointmentRouter.get("/", requireAuth, asyncHandler(listMyAppointments));
```

Mount in app.ts: `app.use("/api/appointments", appointmentRouter)`

---

### Server Tests: `server/tests/appointment.test.ts`

Setup helpers (reuse existing `registerDoctor`, `registerPatient` pattern from auth helpers):

- `setupDoctorWithSchedule(email, dow, start, end)` — registers doctor, completes profile,
  seeds a schedule entry, returns { session, profileId }
- `registerPatient(email)` — registers patient, returns session

Test cases:

1. **Books successfully** — patient books a valid available slot → 201, status "pending"
2. **409 on double-book** — same slot booked twice → second returns 409
3. **400 for slot not in schedule** — slot time that the doctor doesn't offer → 400 or 409
4. **400 for past date** — appointmentDate = "2020-01-06" → 409 (not in available slots,
   since past dates return empty slots in generateSlots) — status 409
5. **403 when doctor tries to book** — doctor session calls POST /api/appointments → 403
6. **GET /api/appointments returns patient list** — book 2 appointments → GET returns 2
7. **Pagination** — book 11 appointments → GET page=1 returns 10, page=2 returns 1

---

### Client (Sitting 1)

#### New: `client/src/features/appointments/schemas.ts`

```ts
export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  specializationName: string;
  appointmentDate: string; // YYYY-MM-DD
  slotStart: string; // HH:MM
  slotEnd: string; // HH:MM
  status: "pending" | "confirmed" | "completed" | "cancelled";
  reason: string | null;
}

export interface AppointmentsResponse {
  appointments: Appointment[];
  total: number;
  page: number;
  pageSize: number;
}
```

#### New: `client/src/features/appointments/api.ts`

```ts
export const bookAppointment = async (input: BookInput): Promise<Appointment>
export const listMyAppointments = async (params): Promise<AppointmentsResponse>
export const cancelAppointment = async (id: string): Promise<Appointment>
```

#### New: `client/src/features/appointments/hooks.ts`

```ts
export const useMyAppointments = (params) => useQuery(...)  // staleTime: 30s
export const useBookAppointment = () => useMutation(...)
export const useCancelAppointment = () => useMutation(...)
```

#### Modify: `client/src/features/doctors/components/SlotPicker.tsx`

- Replace the `toast.info("Phase 4...")` click handler with state: `selectedSlot`
- When a slot is selected, show `BookingModal`

#### New: `client/src/features/appointments/components/BookingModal.tsx`

Props: `{ doctorId, doctorName, date, slot: {start, end}, onClose, onSuccess }`
Contents:

- Summary card: doctor name, date, time slot
- Textarea: reason (optional, max 500 chars)
- "Book appointment" button (calls `useBookAppointment`)
- On success: `onSuccess()` → navigate to `/appointments` + toast "Appointment booked"
- On 409: show inline error "This slot was just taken — please pick another"

#### New: `client/src/features/appointments/pages/PatientAppointmentsPage.tsx`

Route: `/appointments`

- List of `AppointmentCard` components
- Status filter tabs: All / Upcoming / Past
- Pagination
- Empty state: "No appointments yet. Find a doctor to book your first slot."

#### New: `client/src/features/appointments/components/AppointmentCard.tsx`

Displays: doctor name, specialization, date, time, status badge, cancel button (pending only)
Status badge colors:

- pending → amber
- confirmed → blue
- completed → green
- cancelled → muted

#### Route: add `/appointments` to `routes.tsx` inside ProtectedRoute

---

## Sitting 2 — Doctor Appointment Management

### Server

#### Add to `appointment.service.ts`:

- `listDoctorAppointments(doctorId, query)` — joins patient name, paginated
- `updateAppointmentStatus(appointmentId, newStatus, requestingUser)`:
  - Fetch appointment, verify it exists
  - Role-based transition guard:
    ```
    patient: can only → cancelled (from pending)
    doctor:  can → confirmed (from pending)
             can → completed (from confirmed)
             can → cancelled (from pending | confirmed)
    ```
  - Invalid transition → `AppError(409, "Cannot transition from X to Y")`
  - Not their appointment → `AppError(403, "Not authorized")`
  - Returns updated appointment

#### Add to `appointment.controller.ts`:

```ts
export const listDoctorAppointments; // GET /api/me/doctor-appointments
export const updateStatus; // PATCH /api/appointments/:id/status
```

#### Add routes:

```ts
// In appointment.routes.ts:
appointmentRouter.patch("/:id/status", requireAuth, asyncHandler(updateStatus));

// In profile.routes.ts (me prefix):
profileRouter.get(
  "/doctor-appointments",
  requireAuth,
  asyncHandler(listDoctorAppointments),
);
```

---

### Server Tests (add to `appointment.test.ts`):

8. **Doctor confirms pending** → status becomes "confirmed"
9. **Doctor completes confirmed** → status becomes "completed"
10. **Patient cancels pending** → status becomes "cancelled"
11. **Patient cannot confirm** → 403
12. **Cannot cancel a completed appointment** → 409
13. **Doctor list** — doctor session GET /api/me/doctor-appointments returns their appointments
14. **403 on wrong doctor** — doctor A cannot update doctor B's appointment

---

### Client (Sitting 2)

#### New: `client/src/features/appointments/pages/DoctorAppointmentsPage.tsx`

Route: `/my-appointments`

- Fetch with `useDoctorAppointments` hook (calls GET /api/me/doctor-appointments)
- Each row: patient name, date, time, status badge + action buttons
  - Pending: "Confirm" + "Cancel"
  - Confirmed: "Mark complete" + "Cancel"
  - Completed/Cancelled: no actions
- Action buttons call `useUpdateAppointmentStatus` mutation
- Optimistic update or refetch on success

#### New: `client/src/features/appointments/hooks.ts` additions:

```ts
export const useDoctorAppointments = (params) => useQuery(...)
export const useUpdateAppointmentStatus = () => useMutation(...)
```

#### Modify: `client/src/pages/DashboardPage.tsx`

- Patient section: add "Next appointment" card — shows soonest confirmed/pending appointment
  - Calls `useMyAppointments({ status: undefined, page: 1 })`, picks first upcoming
- Doctor section: add "Upcoming appointments" count badge on the appointments card

#### Route: add `/my-appointments` to `routes.tsx` inside ProtectedRoute (doctor-only guard)

---

## Sitting 3 — Reviews

### Server

#### New file: `server/src/schemas/review.schema.ts`

```ts
export const createReviewSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating max is 5"),
  comment: z.string().max(1000).optional(),
});
```

#### New file: `server/src/services/review.service.ts`

`createReview(patientId, appointmentId, input)`:

1. Fetch appointment — 404 if not found
2. Verify `appointment.patientId === patientId` → 403 otherwise
3. Verify `appointment.status === "completed"` → 400 "Appointment not completed yet"
4. Check no existing review → 409 "Already reviewed"
5. Inside transaction:
   a. Insert into `reviews`
   b. Recalculate and update `doctor_profiles.averageRating`:
   ```ts
   await tx.execute(
     sql`UPDATE doctor_profiles
         SET average_rating = (
           SELECT ROUND(AVG(rating)::numeric, 2)
           FROM reviews WHERE doctor_id = ${doctorId}
         )
         WHERE id = ${doctorId}`,
   );
   ```

#### New file: `server/src/controllers/review.controller.ts`

```ts
export const createReview; // POST /api/appointments/:id/review
```

#### Route addition in `appointment.routes.ts`:

```ts
appointmentRouter.post("/:id/review", requireAuth, asyncHandler(createReview));
```

---

### Server Tests: `server/tests/review.test.ts`

Setup: complete appointment flow (book → confirm → complete) as fixtures.

1. **Patient reviews completed appointment** → 201, doctor averageRating updates
2. **409 when already reviewed** — submit review twice → second is 409
3. **403 when wrong patient** — different patient tries to review → 403
4. **400 when appointment not completed** — review a pending appointment → 400
5. **averageRating recalc** — two reviews with ratings 4 and 2 → averageRating = 3.00

---

### Client (Sitting 3)

#### New: `client/src/features/appointments/api.ts` addition:

```ts
export const submitReview = async (appointmentId: string, input: ReviewInput): Promise<void>
```

#### New: `client/src/features/appointments/components/ReviewModal.tsx`

Props: `{ appointment: Appointment, onClose, onSuccess }`
Contents:

- "How was your appointment with Dr. X?"
- Star rating: 5 clickable stars (highlight on hover/select)
- Optional comment textarea (max 1000 chars)
- "Submit review" button
- On success: close modal + toast "Review submitted"

#### Modify: `AppointmentCard.tsx`

- For `status === "completed"` appointments that have no review yet:
  - Add "Leave a review" button that opens `ReviewModal`
  - Track `hasReview` boolean (backend should return this in the list response)

#### Modify: `appointment.service.ts → listPatientAppointments`

- Add `hasReview: boolean` to each appointment in the response
  (LEFT JOIN reviews ON reviews.appointment_id = appointments.id, check for null)

#### Modify: `DoctorCard.tsx` and `DoctorDetailPage.tsx`

- `averageRating` is already in the API response — it now reflects real data
- Star display: `(★ 4.5)` or `(★ No rating yet)`

---

## API Summary

| Method | Path                         | Auth    | Description                  |
| ------ | ---------------------------- | ------- | ---------------------------- |
| POST   | /api/appointments            | patient | Book a slot                  |
| GET    | /api/appointments            | patient | List own appointments        |
| PATCH  | /api/appointments/:id/status | any     | Update status (role-guarded) |
| POST   | /api/appointments/:id/review | patient | Submit review                |
| GET    | /api/me/doctor-appointments  | doctor  | List doctor's appointments   |

---

## Commit Strategy (6 commits)

```
feat(appointments): add booking API with slot re-validation
feat(appointments): add server tests for booking and status transitions
feat(appointments): add doctor appointment management endpoints + review API
feat(appointments): add server tests for reviews and averageRating recalc
feat(appointments): add BookingModal, SlotPicker wiring, patient appointments page
feat(appointments): add doctor appointments page, review modal, dashboard wiring
```

---

## Implementation Notes

- **Slot time format**: DB stores `time` as `HH:MM:SS`; compare using `toHHMM()` from
  `slot.service.ts` (already exported or inline `t.slice(0, 5)`)
- **Page size**: use `APPOINTMENT_PAGE_SIZE = 10` (smaller than doctors list since
  appointments are personal data, not browsing)
- **Doctor guard helper**: create `requireDoctor(req)` that throws 403 if role !== "doctor"
  to avoid repeating the check in every doctor controller
- **Patient guard helper**: same for `requirePatient(req)`
- **No `as` / `any`**: use `inArray` from drizzle-orm for the status array check, not a
  raw cast
- **Line caps**: if `appointment.controller.ts` approaches 150 lines, extract the
  `listDoctorAppointments` handler into a separate `doctorAppointment.controller.ts`
- **Mobile-first**: appointment list cards stack vertically, action buttons full-width on
  mobile, side-by-side on md+
