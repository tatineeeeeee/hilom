# Hilom — Development Phases

> `[ ]` Not Started | `[~]` In Progress | `[x]` Completed

---

## Phase 1 — Project Setup `[x]`

Monorepo, Express + Drizzle + PostgreSQL, React + Vite + Tailwind.

**Created**: root package.json, .gitignore, .env.example, server/ (package.json, tsconfig, drizzle.config, index.ts, app.ts, env.ts, db.ts, schema.ts, seed.ts, errorHandler.ts), client/ (package.json, vite.config, tsconfig, tailwind.config, postcss.config, index.html, main.tsx, App.tsx, index.css)

**Verified**: health check, 12 tables, 10 specializations seeded, Tailwind working.

---

## Phase 2 — Authentication `[x]`

JWT auth: register, login, refresh, logout, protected routes, profile setup.

**Server files**:
- `controllers/auth.controller.ts` — register, login, logout, refresh, me
- `routes/auth.routes.ts`
- `middleware/auth.middleware.ts` — JWT verification, attaches `req.user`
- `middleware/roleGuard.ts` — restrict by role
- `middleware/validateRequest.ts` — Zod body validation
- `types/express.d.ts` — `req.user` type extension

**Client files**:
- `api/client.ts` — Axios instance, interceptors (attach token, auto-refresh on 401)
- `api/auth.ts` — register, login, logout, refresh, me API calls
- `store/authStore.ts` — Zustand: user, accessToken, login/logout actions
- `hooks/useAuth.ts` — convenience hook
- `types/index.ts` — User, AuthResponse, Role types
- `pages/auth/LoginPage.tsx`, `RegisterPage.tsx`, `ProfileSetupPage.tsx`
- `components/layout/ProtectedRoute.tsx`, `Navbar.tsx`
- `components/ui/Button.tsx`, `Input.tsx`

**Done when**:
- [x] Register → hashed password → user + role-specific profile created
- [x] Login → access token (body) + refresh token (httpOnly cookie)
- [x] Refresh → new access token from cookie (with rotation + reuse detection)
- [x] `GET /api/auth/me` → current user (requires token)
- [x] Role guard rejects unauthorized roles
- [x] Axios interceptor auto-refreshes on 401 (single-flight)
- [x] Frontend forms with Zod validation + accessible error display

---

## Phase 3 — Doctors + Specializations `[ ]`

Browse doctors, filter, schedule management, slot generation.

**Server files**:
- `controllers/doctor.controller.ts` — list, detail, update profile, update schedule, get slots
- `routes/doctor.routes.ts`
- `services/slot.service.ts` — generate available time slots

**Client files**:
- `api/doctors.ts`
- `pages/doctors/DoctorListPage.tsx`, `DoctorDetailPage.tsx`
- `components/doctors/DoctorCard.tsx`, `DoctorFilter.tsx`, `SlotPicker.tsx`
- `utils/formatCurrency.ts`

**Done when**:
- [ ] `GET /api/specializations` returns seeded list
- [ ] `GET /api/doctors` filters by specialization, name, fee, rating
- [ ] `GET /api/doctors/:id` returns profile with specialization + rating
- [ ] Doctor updates own profile and weekly schedule
- [ ] `GET /api/doctors/:id/slots?date=` returns available slots (excludes booked + past)
- [ ] Frontend: doctor list with filters, detail page, slot picker

---

## Phase 4 — Appointments `[ ]`

Book, confirm, complete, cancel. Full lifecycle.

**Server files**:
- `controllers/appointment.controller.ts`
- `routes/appointment.routes.ts`

**Client files**:
- `api/appointments.ts`
- `pages/appointments/BookAppointmentPage.tsx`, `MyAppointmentsPage.tsx`, `AppointmentDetailPage.tsx`
- `components/appointments/AppointmentCard.tsx`, `StatusBadge.tsx`
- `utils/formatDate.ts`

**Done when**:
- [ ] Patient books available slot → pending
- [ ] Double-booking prevented (same doctor, same slot)
- [ ] Doctor confirms → confirmed, completes → completed
- [ ] Patient or doctor cancels → cancelled
- [ ] `GET /api/appointments` returns role-appropriate list
- [ ] Frontend: booking flow, list with status badges, detail with actions

---

## Phase 5 — Real-time Chat `[ ]`

Socket.io chat, unlocked per confirmed appointment.

**Server files**:
- `socket/socket.ts` — Socket.io server, JWT handshake, room management
- `controllers/message.controller.ts`
- `routes/message.routes.ts`

**Client files**:
- `api/messages.ts`
- `hooks/useSocket.ts`
- `store/chatStore.ts` — active conversation, unread counts
- `pages/messages/ChatRoomPage.tsx`
- `components/chat/ChatRoom.tsx`, `MessageBubble.tsx`, `MessageInput.tsx`

**Done when**:
- [ ] Conversation auto-created when appointment → confirmed
- [ ] Only patient + doctor in that appointment can access
- [ ] Messages persist to DB + real-time delivery
- [ ] Chat history loads on open
- [ ] Typing indicators + read receipts
- [ ] Frontend: chat room with bubbles + input

---

## Phase 6 — Prescriptions `[ ]`

Doctor writes prescription with medications, patient views.

**Server files**:
- `controllers/prescription.controller.ts`
- `routes/prescription.routes.ts`

**Client files**:
- `api/prescriptions.ts`
- `pages/prescriptions/WritePrescriptionPage.tsx`, `MyPrescriptionsPage.tsx`

**Done when**:
- [ ] Doctor writes prescription for completed appointment (with medications)
- [ ] Patient views per-appointment + all prescriptions
- [ ] One prescription per appointment max
- [ ] Frontend: dynamic medication rows form + view page

---

## Phase 7 — Payments `[ ]`

PayMongo integration with app-level escrow (PayMongo has no native escrow — we track hold/release in our DB).

**Server files**:
- `services/paymongo.service.ts` — PayMongo API wrapper
- `controllers/payment.controller.ts`
- `routes/payment.routes.ts`

**Client files**:
- `api/payments.ts`

**Done when**:
- [ ] Create payment intent → pending
- [ ] Patient pays → escrowed
- [ ] Doctor completes → released
- [ ] Cancel → refunded
- [ ] Payment history works
- [ ] Frontend: payment flow in booking (GCash, Maya, card)

---

## Phase 8 — Reviews + Admin `[ ]`

Star ratings for doctors. Admin panel for verification + management.

**Server files**:
- `controllers/review.controller.ts`, `admin.controller.ts`
- `routes/review.routes.ts`, `admin.routes.ts`

**Client files**:
- `api/reviews.ts`, `admin.ts`
- `pages/admin/UserManagementPage.tsx`, `DoctorVerificationPage.tsx`

**Done when**:
- [ ] Patient reviews after completed appointment (1-5 stars + comment)
- [ ] One review per appointment, doctor's average_rating updates
- [ ] Admin: view users, verify/reject doctors, view appointments, dashboard stats

---

## Phase 9 — Dashboards `[ ]`

Role-specific dashboards with real data.

**Client files**:
- `pages/dashboard/PatientDashboard.tsx`, `DoctorDashboard.tsx`, `AdminDashboard.tsx`
- `components/ui/Card.tsx`, `Badge.tsx`, `Avatar.tsx`

**Done when**:
- [ ] Patient: upcoming appointments, recent prescriptions, quick book
- [ ] Doctor: today's schedule, pending confirmations, earnings, rating
- [ ] Admin: total users, appointments, revenue, unverified doctors
- [ ] Responsive (mobile + desktop)

---

## Phase 10 — Tests `[ ]`

20+ backend integration tests.

**Files**:
- `server/jest.config.ts`
- `server/tests/setup.ts`, `auth.test.ts`, `doctor.test.ts`, `appointment.test.ts`, `prescription.test.ts`, `payment.test.ts`, `review.test.ts`, `admin.test.ts`

**Done when**:
- [ ] Test DB created/cleaned per suite
- [ ] Auth (5) + Doctor (4) + Appointment (3) + Prescription (3) + Payment (2) + Review (3) + Admin (2) = 22 tests
- [ ] All pass: `bun run --filter server test`

---

## Phase 11 — CI/CD + Deploy `[ ]`

GitHub Actions, Vercel + Railway.

**Files**:
- `.github/workflows/ci.yml`, `deploy.yml`
- `client/vercel.json` (if needed)

**Done when**:
- [ ] Tests run on every PR
- [ ] Push to main → deploy frontend (Vercel) + backend (Railway)
- [ ] Socket.io works in production (WebSocket upgrade)
- [ ] CORS configured for production domain
- [ ] README.md with setup instructions
