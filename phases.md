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

## Phase 2.5 — Operational Foundation `[ ]`

Knock out the five blockers from senior review before more features land. CI, auth tests, structured logging, prod-hardened env, README — the floor that makes everything after this safe.

**Server files**:
- `server/src/config/logger.ts` — pino with per-request correlation IDs
- `server/src/middleware/requestId.ts` — adds `req.id`, propagates to logger
- `server/src/middleware/rateLimit.ts` — Redis-backed (`rate-limit-redis`) with in-memory fallback for dev
- `server/src/index.ts` — graceful SIGTERM: stop accepting, drain in-flight, close DB pool
- `server/src/config/env.ts` — fail-closed in production: no JWT defaults, `min(32)` on secrets
- `server/jest.config.ts`, `server/tests/setup.ts`
- `server/tests/auth.test.ts` — register dup (409), register profile-creation, login generic-error (401), refresh rotation, refresh reuse-detection

**Client files**:
- `client/src/lib/sentry.ts` — error reporting init (gated on env)
- `client/src/lib/api/client.ts` — propagate `X-Request-Id` header so client + server logs correlate

**Root files**:
- `.github/workflows/ci.yml` — typecheck + lint + test on every PR
- `.github/PULL_REQUEST_TEMPLATE.md` — what changed, why, manual verification, screenshots
- `.husky/pre-commit` — `bunx tsc --noEmit` + `lint-staged`
- `.husky/commit-msg` — commitlint with conventional-commits config
- `README.md` — what is Hilom (1 paragraph), tech stack table, quickstart, architecture diagram (Mermaid), screenshots
- `LICENSE` — MIT
- `.env.example` audited — every key in `env.ts` represented, no real secrets
- Branch protection on `main` — require PR + green CI before merge

**Done when**:
- [ ] PR opens → CI runs typecheck + lint + tests, blocks merge on red
- [ ] Auth integration suite covers: register dup, register-creates-profile, login generic-error, refresh rotation, refresh reuse-detection (5 tests minimum)
- [ ] Production refuses to boot without `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` set (no defaults)
- [ ] Every HTTP log line carries a request ID; client propagates same ID via `X-Request-Id`
- [ ] Errors in client + server flow to Sentry (or a structured logger placeholder if Sentry deferred)
- [ ] SIGTERM drains in-flight requests then closes the DB pool — no hard kills on deploy
- [ ] Husky pre-commit blocks broken types + non-conventional commit messages
- [ ] README explains the project, local setup, and architecture in <2 minutes of reading
- [ ] No direct pushes to `main` allowed (branch protection enforced)
- [ ] Repo has MIT license and a PR template

---

## Phase 2.6 — Auth Completion `[ ]`

Close the auth gap: email verification + password reset. Without these, "auth is done" is a half-truth and recruiters notice.

**Server files**:
- `server/src/services/email.service.ts` — Resend (or Postmark) wrapper, transactional email templates
- `server/src/db/schema.ts` — add `users.email_verified_at`, new tables `email_verification_tokens`, `password_reset_tokens` (each: `id`, `user_id`, `token_hash`, `expires_at`, `used_at`)
- `server/src/controllers/auth.controller.ts` — extend with: `requestEmailVerification`, `verifyEmail`, `requestPasswordReset`, `resetPassword`
- `server/src/routes/auth.routes.ts` — wire new endpoints
- `server/src/schemas/auth.schema.ts` — Zod schemas for the new payloads

**Client files**:
- `client/src/features/auth/pages/VerifyEmailPage.tsx` — landing page that consumes the token in the URL
- `client/src/features/auth/pages/ForgotPasswordPage.tsx` — email input → send link
- `client/src/features/auth/pages/ResetPasswordPage.tsx` — new-password form, consumes token
- `client/src/features/auth/api.ts` — extend with the new API calls
- `client/src/features/auth/pages/LoginPage.tsx` — add "Forgot password?" link
- Banner on `Dashboard` if `email_verified_at` is null prompting user to verify

**Done when**:
- [ ] Register sends a verification email with a single-use token (15-min expiry)
- [ ] `GET /api/auth/verify-email?token=...` flips `email_verified_at`, marks token used
- [ ] `POST /api/auth/forgot-password` sends a reset email (always returns 200 — never reveals if email exists)
- [ ] Reset link expires in 15 min, single-use; consuming it logs the user out of all sessions (clears `refresh_token_hash`)
- [ ] Tokens are hashed in DB (SHA-256), never stored raw
- [ ] Rate limit on `forgot-password` and `verify-email` (3 per hour per email)
- [ ] Integration tests: verify-email happy path, expired token, replay, wrong token; reset happy path, expired, replay, wrong token (8 tests)

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

Full backend integration coverage + E2E for the golden user paths.

**Files (backend integration — extends the auth suite from Phase 2.5)**:
- `server/tests/doctor.test.ts`, `appointment.test.ts`, `prescription.test.ts`, `payment.test.ts`, `review.test.ts`, `admin.test.ts`

**Files (E2E)**:
- `e2e/playwright.config.ts`
- `e2e/auth.spec.ts` — register, login, logout, session restore on reload
- `e2e/booking.spec.ts` — patient books a slot, doctor confirms, both see status update
- `e2e/payment.spec.ts` — patient pays (mocked PayMongo), payment shows escrowed, doctor completes → released
- `e2e/chat.spec.ts` — confirmed appointment unlocks chat, messages persist + show in real time
- `e2e/review.spec.ts` — completed appointment lets patient leave a review

**Done when**:
- [ ] Test DB created/cleaned per suite (auth tests already in Phase 2.5)
- [ ] Backend: Doctor (4) + Appointment (3) + Prescription (3) + Payment (2) + Review (3) + Admin (2) = 17 new tests on top of Phase 2.5's 5 auth = 22 total
- [ ] All backend tests pass: `bun run --filter server test`
- [ ] Playwright E2E covers register → book → pay → chat → review (5 specs)
- [ ] Coverage report generated; client + server >70% line coverage on critical paths
- [ ] CI runs both backend integration AND E2E on every PR (E2E may run on a nightly job if too slow for PR)

---

## Phase 11 — Production Deploy + Portfolio Polish `[ ]`

Push the project from "good code" to "I would hire this person." Live demo, real polish, recruiter-visible signal.

**Files**:
- `.github/workflows/deploy.yml` — push to main → Railway (server) + Vercel (client)
- `.github/dependabot.yml` — weekly bumps for npm + GitHub Actions
- `.github/release.yml` + release-please config — auto-generate `CHANGELOG.md` from conventional commits
- `client/vercel.json` (if needed for SPA fallback / rewrites)
- `docs/architecture.md` — Mermaid diagrams: system, auth flow, payment flow
- `docs/screenshots/` — mobile + desktop, all major pages
- `README.md` — fully polished (see "Done when")

**Done when**:
- [ ] Push to main → frontend on Vercel, backend on Railway, both green
- [ ] Live demo URL pinned in repo "About" + at the top of README
- [ ] Socket.io works over WSS in production (WebSocket upgrade through Railway proxy)
- [ ] Production CORS locked to the actual Vercel domain (no wildcards)
- [ ] Refresh cookie works cross-origin (`sameSite: 'none'`, `secure: true`)
- [ ] README header has badges: CI status, license, deploy, coverage
- [ ] README has: 1-paragraph product pitch, tech-stack table, quickstart, architecture diagram, screenshot grid, deploy URL, link to live demo + video walkthrough
- [ ] Architecture diagram (Mermaid) shows client / server / DB / external services (PayMongo, Sentry, Redis)
- [ ] Auth flow + payment flow each have their own Mermaid sequence diagram in `docs/`
- [ ] Mobile + desktop screenshots for: home, register, dashboard, doctor list, doctor detail, booking, chat, prescription, admin
- [ ] LICENSE file (MIT) in repo root
- [ ] Dependabot enabled and a successful weekly bump PR has merged
- [ ] `CHANGELOG.md` auto-generates from conventional commits on each release
- [ ] Lighthouse score on the production client: Performance >85, Accessibility >95, Best Practices >95, SEO >90
- [ ] OpenAPI spec (`server/openapi.json`) generated from Zod schemas + served at `/api/docs` via Swagger UI

---

## Backlog — deferred items worth tracking

Captured here so they aren't forgotten. None block the phase plan; each is its own future ticket.

**Auth — beyond Phase 2.6**:
- Multi-device refresh (move `refresh_token_hash` column → `refresh_tokens` table keyed on `user_id, jti`)
- "Log out everywhere" UI
- Optional: OAuth social login (Google, Apple)
- Migrate `bcryptjs` → `argon2` (password hashes can be re-hashed lazily on next login)

**Healthcare compliance** (Data Privacy Act 2012 / RA 10173):
- Encryption at rest for sensitive columns: `messages.content`, `prescriptions.notes`, `patient_profiles.allergies` (Postgres `pgcrypto`)
- Immutable audit-log table for read/write of patient data
- Right-to-erasure workflow (soft-delete + tombstones)
- Doctor verification with PRC license number + uploaded credential review queue

**Payments hardening**:
- Migrate from "app-level escrow" → PayMongo Connected Accounts (money never lands in your platform balance)
- Webhook signature verification + idempotency keys
- Refund flow with reason codes

**Performance / scale**:
- DB pool sizing tuned to Railway plan
- Read replica for `/doctors` browsing list
- Image optimization pipeline (avatars, credential uploads)
- React Query persisted cache for offline-tolerant browsing
- Bundle splitting per route (currently one chunk)

**Product polish**:
- i18n setup with `react-i18next` (en + tl)
- PWA: installable, offline-tolerant for "my upcoming appointments" view
- Email/SMS reminders 24h before appointments
- Push notifications for new chat messages
- Doctor availability calendar (visual week view, not just a list)
- Patient medical history attachments

**Engineering polish**:
- Storybook for UI primitives + auth forms
- Visual regression tests (Chromatic / Percy)
- API rate-limit response includes `Retry-After` header
- Per-account rate limit on `/login` (in addition to per-IP)
- Request size limit explicit per route
- Structured logging schema documented
