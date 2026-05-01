# Hilom — Development Phases

> Track progress: `[ ]` Not Started | `[~]` In Progress | `[x]` Completed

---

## Phase 1 — Project Setup (Days 1-2)
**Status**: `[x] Completed`

**Goal**: Working monorepo with Express health check + React hello world + Drizzle connected to PostgreSQL

**Files to create**:
- `package.json` — workspaces root
- `.gitignore`
- `.env.example`
- `server/package.json`, `server/tsconfig.json`, `server/drizzle.config.ts`
- `server/src/index.ts` — entry point (Express + http server)
- `server/src/app.ts` — Express app with middleware (cors, helmet, morgan, json)
- `server/src/config/env.ts` — Zod-validated env vars
- `server/src/config/db.ts` — Drizzle + pg pool
- `server/src/db/schema.ts` — all 12 Drizzle table definitions
- `server/src/db/seed.ts` — specialization seeder
- `server/src/middleware/errorHandler.ts` — async error wrapper
- `client/package.json`, `client/vite.config.ts`, `client/tsconfig.json`, `client/tsconfig.node.json`
- `client/tailwind.config.ts`, `client/postcss.config.js`
- `client/index.html`, `client/src/main.tsx`, `client/src/App.tsx`

**Done when**:
- [ ] `bun install` from root installs both workspaces
- [ ] `bun run dev` starts both client (5173) and server (4000)
- [ ] `GET /api/health` returns `{ status: "ok", timestamp: ... }`
- [ ] Drizzle connects to local PostgreSQL
- [ ] `bun run --filter server db:push` creates all 12 tables
- [ ] `bun run --filter server db:seed` seeds specializations
- [ ] React app renders "Hilom" at localhost:5173
- [ ] Tailwind CSS works

---

## Phase 2 — Authentication (Days 3-4)
**Status**: `[ ] Not Started`

**Goal**: JWT auth — register, login, refresh, logout, protected routes, profile setup

**Files to create**:
- `server/src/controllers/auth.controller.ts`
- `server/src/routes/auth.routes.ts`
- `server/src/middleware/auth.middleware.ts` — JWT verification
- `server/src/middleware/roleGuard.ts`
- `server/src/middleware/validateRequest.ts` — Zod middleware
- `server/src/types/express.d.ts` — req.user extension
- `client/src/api/client.ts` — axios instance with interceptors
- `client/src/api/auth.ts`
- `client/src/store/authStore.ts` — Zustand
- `client/src/hooks/useAuth.ts`
- `client/src/types/index.ts`
- `client/src/pages/auth/LoginPage.tsx`, `RegisterPage.tsx`, `ProfileSetupPage.tsx`
- `client/src/components/layout/ProtectedRoute.tsx`, `Navbar.tsx`
- `client/src/components/ui/Button.tsx`, `Input.tsx`

**Done when**:
- [ ] Register creates user with hashed password (bcryptjs, 12 rounds)
- [ ] Login returns access token in body + refresh token in httpOnly cookie
- [ ] Access token expires in 15m, refresh in 7d
- [ ] `POST /api/auth/refresh` issues new access token from cookie
- [ ] `GET /api/auth/me` returns current user
- [ ] Role guard blocks unauthorized roles
- [ ] Axios interceptor auto-refreshes on 401
- [ ] Patient registration creates patient_profile, doctor creates doctor_profile
- [ ] Frontend login/register forms with validation errors

---

## Phase 3 — Doctors + Specializations (Days 5-7)
**Status**: `[ ] Not Started`

**Goal**: Doctor profiles browsable by patients, schedule management, slot generation

**Files to create**:
- `server/src/controllers/doctor.controller.ts`
- `server/src/routes/doctor.routes.ts`
- `server/src/services/slot.service.ts`
- `client/src/api/doctors.ts`
- `client/src/pages/doctors/DoctorListPage.tsx`, `DoctorDetailPage.tsx`
- `client/src/components/doctors/DoctorCard.tsx`, `DoctorFilter.tsx`, `SlotPicker.tsx`
- `client/src/utils/formatCurrency.ts`

**Done when**:
- [ ] `GET /api/specializations` returns seeded list
- [ ] `GET /api/doctors` filters by specialization, name, fee, rating
- [ ] `GET /api/doctors/:id` returns full profile with specialization + rating
- [ ] `PUT /api/doctors/profile` and `PUT /api/doctors/schedule` work
- [ ] `GET /api/doctors/:id/slots?date=` returns available slots
- [ ] Slots exclude booked/past times
- [ ] Frontend: doctor list with filters, detail page, slot picker

---

## Phase 4 — Appointments (Days 8-9)
**Status**: `[ ] Not Started`

**Goal**: Full appointment lifecycle — book, confirm, complete, cancel

**Files to create**:
- `server/src/controllers/appointment.controller.ts`
- `server/src/routes/appointment.routes.ts`
- `client/src/api/appointments.ts`
- `client/src/pages/appointments/BookAppointmentPage.tsx`, `MyAppointmentsPage.tsx`, `AppointmentDetailPage.tsx`
- `client/src/components/appointments/AppointmentCard.tsx`, `StatusBadge.tsx`
- `client/src/utils/formatDate.ts`

**Done when**:
- [ ] Patient books slot → appointment (pending)
- [ ] Double-booking same slot is prevented
- [ ] Doctor confirms → confirmed, completes → completed
- [ ] Patient/Doctor can cancel
- [ ] `GET /api/appointments` returns role-appropriate list
- [ ] Frontend: booking flow, appointments list, detail with action buttons

---

## Phase 5 — Real-time Chat (Days 10-11)
**Status**: `[ ] Not Started`

**Goal**: Socket.io chat unlocked per confirmed appointment

**Files to create**:
- `server/src/socket/socket.ts`
- `server/src/controllers/message.controller.ts`
- `server/src/routes/message.routes.ts`
- `client/src/api/messages.ts`
- `client/src/hooks/useSocket.ts`
- `client/src/store/chatStore.ts`
- `client/src/pages/messages/ChatRoomPage.tsx`
- `client/src/components/chat/ChatRoom.tsx`, `MessageBubble.tsx`, `MessageInput.tsx`

**Done when**:
- [ ] Conversation auto-created when appointment confirmed
- [ ] Only participants can access conversation
- [ ] Messages persist to DB + real-time via Socket.io
- [ ] Chat history loads on open
- [ ] Typing indicators + read receipts
- [ ] Frontend: chat room with message bubbles + input

---

## Phase 6 — Prescriptions (Day 12)
**Status**: `[ ] Not Started`

**Goal**: Doctor writes prescriptions with medications, patient views them

**Files to create**:
- `server/src/controllers/prescription.controller.ts`
- `server/src/routes/prescription.routes.ts`
- `client/src/api/prescriptions.ts`
- `client/src/pages/prescriptions/WritePrescriptionPage.tsx`, `MyPrescriptionsPage.tsx`

**Done when**:
- [ ] Doctor writes prescription for completed appointment (with medications)
- [ ] Patient views prescription per appointment + all prescriptions
- [ ] One prescription per appointment max
- [ ] Frontend: write form (dynamic medication rows) + view page

---

## Phase 7 — Payments (Days 13-14)
**Status**: `[ ] Not Started`

**Goal**: PayMongo integration — pay on booking, escrow, release on completion

**Files to create**:
- `server/src/services/paymongo.service.ts`
- `server/src/controllers/payment.controller.ts`
- `server/src/routes/payment.routes.ts`
- `client/src/api/payments.ts`

**Done when**:
- [ ] `POST /payments/create-intent` creates PayMongo payment intent
- [ ] Status flow: pending → escrowed → released (or refunded)
- [ ] `POST /payments/release/:appointmentId` works
- [ ] Payment history endpoint works
- [ ] Frontend: payment flow in booking
- [ ] GCash, Maya, card via PayMongo

---

## Phase 8 — Reviews + Admin (Days 15-16)
**Status**: `[ ] Not Started`

**Goal**: Star ratings, admin panel, doctor verification

**Files to create**:
- `server/src/controllers/review.controller.ts`, `admin.controller.ts`
- `server/src/routes/review.routes.ts`, `admin.routes.ts`
- `client/src/api/reviews.ts`, `admin.ts`
- `client/src/pages/admin/UserManagementPage.tsx`, `DoctorVerificationPage.tsx`

**Done when**:
- [ ] Patient reviews after completed appointment (1-5 stars + comment)
- [ ] One review per appointment, average_rating updates
- [ ] Admin: view users, verify/reject doctors, view appointments, dashboard stats

---

## Phase 9 — Dashboards (Day 17)
**Status**: `[ ] Not Started`

**Goal**: Role-specific dashboards with real stats

**Files to create**:
- `client/src/pages/dashboard/PatientDashboard.tsx`, `DoctorDashboard.tsx`, `AdminDashboard.tsx`
- `client/src/components/ui/Card.tsx`, `Badge.tsx`, `Avatar.tsx`

**Done when**:
- [ ] Patient: upcoming appointments, recent prescriptions, quick book
- [ ] Doctor: today's appointments, pending confirmations, earnings, rating
- [ ] Admin: total users, appointments, revenue, recent signups, unverified doctors
- [ ] Responsive (mobile + desktop)

---

## Phase 10 — Tests (Day 18)
**Status**: `[ ] Not Started`

**Goal**: 20+ backend integration tests (Jest + Supertest)

**Files to create**:
- `server/jest.config.ts`
- `server/tests/setup.ts`
- `server/tests/auth.test.ts`, `doctor.test.ts`, `appointment.test.ts`
- `server/tests/prescription.test.ts`, `payment.test.ts`, `review.test.ts`, `admin.test.ts`

**Done when**:
- [ ] Test DB created/cleaned per suite
- [ ] Auth (5), Doctor (4), Appointment (3), Prescription (3), Payment (2), Review (3), Admin (2) = 22 tests
- [ ] All pass: `bun run --filter server test`

---

## Phase 11 — CI/CD + Deploy (Days 19-20)
**Status**: `[ ] Not Started`

**Goal**: Automated testing + deployment

**Files to create**:
- `.github/workflows/ci.yml`, `deploy.yml`
- `client/vercel.json` (if needed)

**Done when**:
- [ ] GitHub Action runs tests on every PR
- [ ] Push to main → deploy to Vercel (frontend) + Railway (backend)
- [ ] Socket.io works in production
- [ ] CORS configured for production domain
- [ ] README.md with setup instructions
