# Manual test plan

Run before any release. Covers everything from Phase 5 onward — the
features in PR #4. ~30 minutes end-to-end if no bugs.

## Prereqs

```bash
# fresh start
bun install
bun run --filter server db:push
bun run --filter server db:seed         # specializations
bun run --filter server db:seed:doctor  # demo doctor (verified)
bun run --filter server db:seed:admin -- --email=admin@hilom.local --password=Admin1234

# run both
bun run dev   # client :5173, server :4000
```

Open two browser windows:

- A — patient (incognito so cookies don't collide with doctor)
- B — doctor (regular window)

For admin testing, open a third window or reuse one.

---

## 1. Auth & profile setup

- [ ] **Register patient** in window A — go to `/register`, fill form, role = patient
- [ ] Lands on `/dashboard` or `/profile/setup`
- [ ] Email verification banner appears (if email isn't verified)
- [ ] **Logout** via Navbar — redirects to `/`
- [ ] **Login** — back to `/dashboard`
- [ ] **Reload the page** — still logged in (silent refresh works)
- [ ] **Register doctor** in window B — role = doctor
- [ ] In window B, go to `/profile/setup`, fill bio + specialization + fee, save
- [ ] Go to `/profile/schedule`, set Mon–Fri 9–5, save

## 2. Doctor verification (Phase 8)

- [ ] In window A, log in as patient, go to `/doctors`
- [ ] **Demo doctor "Dr. Maria Santos"** appears (verified by seed)
- [ ] **The new doctor from window B does NOT appear** (unverified)
- [ ] Open a third window, log in as admin (`admin@hilom.local` / `Admin1234`)
- [ ] Navbar shows only "Dashboard" + "Admin" — no patient/doctor links
- [ ] Go to `/admin` — stat tiles render with real numbers
- [ ] Go to `/admin/doctors` — see the unverified doctor in the queue
- [ ] Click "Verify" — toast confirms, row disappears
- [ ] Back in window A's `/doctors` page → refresh → both doctors now appear

## 3. Booking + payment (Phases 4 + 7)

- [ ] In window A, click the seeded demo doctor
- [ ] **Reviews section** shows "No reviews yet" empty state
- [ ] Pick a slot in the SlotPicker
- [ ] Booking modal opens — fill reason, click "Book appointment"
- [ ] Toast confirms; redirects to `/payments/<id>`
- [ ] **Payment page** shows the consultation fee + GCash/Maya/Card method selector
- [ ] Click "Pay now" (stub mode) → toast → redirects to `/appointments`
- [ ] AppointmentCard shows "pending" status badge + "Paid" payment badge

## 4. Doctor confirms + chat (Phase 5)

- [ ] In window B (doctor), go to `/my-appointments`
- [ ] See the new appointment with patient name + "pending" badge
- [ ] Click "Confirm" → status flips to "confirmed"
- [ ] **AppointmentCard** now shows a "Chat" button
- [ ] In window A (patient), refresh `/appointments` — also shows "confirmed" + "Chat"
- [ ] Both windows: click "Chat" → both land on `/appointments/<id>/chat`
- [ ] Patient sends a message → **doctor sees it appear without refresh**
- [ ] Doctor replies → patient sees it
- [ ] Close both chat tabs, reopen → message history loads
- [ ] Navbar **Messages** link shows unread badge after message arrives

## 5. Complete + prescription (Phase 6)

- [ ] Doctor (window B) marks the appointment "Complete"
- [ ] **Cannot complete an unpaid appointment** — try this on a fresh booking that wasn't paid → expect 409 / error toast
- [ ] Once paid + completed, AppointmentCard shows **"Issue prescription"** for the doctor
- [ ] Click → `/appointments/<id>/prescription/new`
- [ ] Add 2 medications + notes, click "Issue prescription"
- [ ] Toast confirms; redirects to view page
- [ ] **Patient (window A)** sees the prescription appear without refresh (Socket.io `prescription:new` event)
- [ ] Both can view the prescription at `/appointments/<id>/prescription`
- [ ] Both see it in `/prescriptions` list

## 6. Review (Phase 8 read-side)

- [ ] In window A, on `/appointments`, the completed appointment shows **"Leave a review"**
- [ ] Click → ReviewModal opens
- [ ] Pick 5 stars + comment, submit → toast confirms
- [ ] Go to the doctor's detail page → **Reviews section** now shows the review
- [ ] Patient name renders as `FirstName L.` (privacy)
- [ ] Average rating + count update at the top of the section

## 7. Payment lifecycle finalization (Phase 7)

- [ ] In window A, go to `/payments`
- [ ] See the payment row — status now **"Released"** (auto-released on completion)
- [ ] In window B, go to `/payments` — same row, also "Released"

## 8. Cancel + refund (Phase 7)

- [ ] In window A, book another slot with the seeded doctor
- [ ] Pay it (stub) → escrowed
- [ ] Doctor confirms it
- [ ] Patient cancels → toast; AppointmentCard flips to "cancelled"
- [ ] `/payments` shows the row as **"Refunded"**

## 9. Dashboards (Phase 9)

- [ ] Window A patient `/dashboard` — three cards: upcoming appointment (filled), recent prescriptions (1 item), quick book (link)
- [ ] Window B doctor `/dashboard` — today's schedule (if today matches schedule), pending count, earnings ≥ ₱1,500, rating 5★
- [ ] Admin window `/dashboard` — stat tiles match `/admin` page numbers

## 10. Edge cases

- [ ] **Wrong password** on login → generic "Invalid credentials" error (no email-exists leak)
- [ ] **Double-book the same slot** → 409 toast "Slot is no longer available"
- [ ] **Stranger tries to read another patient's payment** — open `/payments/<other-appointment-id>` directly → error
- [ ] **Direct link to unverified doctor** (need their profile id) → page renders, even though the list hides them

## 11. API surface

- [ ] Open `http://localhost:4000/api/docs` — Swagger UI loads
- [ ] All major sections present: auth, doctors, appointments, payments, chat, prescriptions, admin
- [ ] `http://localhost:4000/api/openapi.json` returns the raw spec

---

## What to do if something breaks

1. **DB state out of sync**: drop and re-push schema:
   ```
   psql -U postgres -d hilom -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   bun run --filter server db:push
   bun run --filter server db:seed
   bun run --filter server db:seed:doctor
   bun run --filter server db:seed:admin -- --email=admin@hilom.local --password=Admin1234
   ```
2. **Socket events missing**: confirm `VITE_SOCKET_URL` matches the
   server URL in `client/.env`.
3. **Payment stuck pending**: webhook isn't running locally; use the
   mock-confirm endpoint via the Pay page, not real PayMongo.
4. **Email verification email never arrives**: in dev, Maildev runs on
   localhost:1080 — open it to read the link.

If any step above fails, capture the request ID from the response
header (`X-Request-Id`) and search `server/logs` (or the terminal
output) for the matching line.
