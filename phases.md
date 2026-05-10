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

## Phase 2.5 — Operational Foundation `[x]`

Knock out the five blockers from senior review before more features land. CI, auth tests, structured logging, prod-hardened env, README — the floor that makes everything after this safe.

**Server files**:

- `server/src/config/logger.ts` — pino with per-request correlation IDs
- `server/src/middleware/requestId.ts` — adds `req.id`, propagates to logger
- ~~`server/src/middleware/rateLimit.ts` — Redis-backed (`rate-limit-redis`) with in-memory fallback for dev~~ **deferred to Phase 11** (no Redis available until Railway). For now: in-memory limiter is kept as-is, with a `skip: () => NODE_ENV === "test"` added so the auth integration suite isn't throttled. Phase 11 swaps the store, keeps the test skip.
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

- [x] PR opens → CI runs typecheck + lint + tests, blocks merge on red
- [x] Auth integration suite covers: register dup, register-creates-profile, login generic-error, refresh rotation, refresh reuse-detection (5 tests minimum)
- [x] Production refuses to boot without `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` set (no defaults)
- [x] Every HTTP log line carries a request ID; client propagates same ID via `X-Request-Id`
- [x] Pino structured logger in place (Sentry deferred to backlog — placeholder satisfied)
- [x] SIGTERM drains in-flight requests then closes the DB pool — no hard kills on deploy
- [x] Husky pre-commit blocks broken types + non-conventional commit messages
- [x] README explains the project, local setup, and architecture in <2 minutes of reading
- [ ] No direct pushes to `main` allowed (branch protection — needs to be enabled in GitHub settings, not verifiable from repo)
- [x] Repo has MIT license and a PR template

---

## Phase 2.6 — Auth Completion `[x]`

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

- [x] Register sends a verification email with a single-use token (15-min expiry)
- [x] `GET /api/auth/verify-email?token=...` flips `email_verified_at`, marks token used
- [x] `POST /api/auth/forgot-password` sends a reset email (always returns 200 — never reveals if email exists)
- [x] Reset link expires in 15 min, single-use; consuming it logs the user out of all sessions (clears `refresh_token_hash`)
- [x] Tokens are hashed in DB (SHA-256), never stored raw
- [x] Rate limit on `forgot-password` and `verify-email` (3 per hour per email)
- [x] Integration tests: verify-email happy path, expired token, replay, wrong token; reset happy path, expired, replay, wrong token (8 tests)

---

## Phase 3 — Doctors + Specializations `[x]`

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

- [x] `GET /api/specializations` returns seeded list
- [x] `GET /api/doctors` filters by specialization, name, fee, rating
- [x] `GET /api/doctors/:id` returns profile with specialization + rating
- [x] Doctor updates own profile and weekly schedule
- [x] `GET /api/doctors/:id/slots?date=` returns available slots (excludes booked + past)
- [x] Frontend: doctor list with filters, detail page, slot picker

---

## Phase 4 — Appointments `[x]`

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

- [x] Patient books available slot → pending
- [x] Double-booking prevented (same doctor, same slot)
- [x] Doctor confirms → confirmed, completes → completed
- [x] Patient or doctor cancels → cancelled
- [x] `GET /api/appointments` returns role-appropriate list
- [x] Frontend: booking flow, list with status badges, detail with actions

---

## Phase 5 — Real-time Chat `[x]`

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

- [x] Conversation auto-created when appointment → confirmed
- [x] Only patient + doctor in that appointment can access
- [x] Messages persist to DB + real-time delivery
- [x] Chat history loads on open
- [x] Read receipts (typing indicators explicitly deferred to backlog per `docs/phase-5-plan.md`)
- [x] Frontend: chat room with bubbles + input + conversation list + Navbar unread badge

---

## Phase 6 — Prescriptions `[x]`

Doctor writes prescription with medications, patient views.

**Server files**:

- `controllers/prescription.controller.ts`
- `routes/prescription.routes.ts`

**Client files**:

- `api/prescriptions.ts`
- `pages/prescriptions/WritePrescriptionPage.tsx`, `MyPrescriptionsPage.tsx`

**Done when**:

- [x] Doctor writes prescription for completed appointment (with medications)
- [x] Patient views per-appointment + all prescriptions
- [x] One prescription per appointment max (DB unique constraint + service guard)
- [x] Frontend: dynamic medication rows form + view page + list page + Navbar link

---

## Phase 7 — Payments `[x]`

PayMongo integration with app-level escrow (PayMongo has no native escrow — we track hold/release in our DB).

**Server files**:

- `services/paymongo.service.ts` — PayMongo API wrapper
- `controllers/payment.controller.ts`
- `routes/payment.routes.ts`

**Client files**:

- `api/payments.ts`

**Done when**:

- [x] Create payment intent → pending
- [x] Patient pays → escrowed
- [x] Doctor completes → released
- [x] Cancel → refunded
- [x] Payment history works
- [x] Frontend: payment flow in booking (GCash, Maya, card)

---

## Phase 8 — Reviews + Admin `[x]`

Star ratings for doctors. Admin panel for verification + management.

**Server files**:

- `controllers/review.controller.ts`, `admin.controller.ts`
- `routes/review.routes.ts`, `admin.routes.ts`

**Client files**:

- `api/reviews.ts`, `admin.ts`
- `pages/admin/UserManagementPage.tsx`, `DoctorVerificationPage.tsx`

**Done when**:

- [x] Patient reviews after completed appointment (1-5 stars + comment)
- [x] One review per appointment, doctor's average_rating updates
- [x] Admin: view users, verify/reject doctors, view appointments, dashboard stats

---

## Phase 9 — Dashboards `[x]`

Role-specific dashboards with real data.

**Client files**:

- `pages/dashboard/PatientDashboard.tsx`, `DoctorDashboard.tsx`, `AdminDashboard.tsx`
- `components/ui/Card.tsx`, `Badge.tsx`, `Avatar.tsx`

**Done when**:

- [x] Patient: upcoming appointments, recent prescriptions, quick book
- [x] Doctor: today's schedule, pending confirmations, earnings, rating
- [x] Admin: total users, appointments, revenue, unverified doctors
- [x] Responsive (mobile + desktop)

---

## Phase 10 — Tests `[x]`

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

- [x] Test DB created/cleaned per suite (auth tests already in Phase 2.5)
- [x] Backend: 110+ tests across 14 suites (way past the 22-test target)
- [x] All backend tests pass: `bun run --filter server test`
- [x] Playwright E2E covers register → login + 4 stub specs documenting future scope
- [x] Coverage report generated; threshold gate deferred until floor is measured
- [x] CI runs build (typecheck + lint + server + client tests) + e2e (PR-only) jobs

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
- [ ] **Rate limit promoted to Redis-backed** (carried over from Phase 2.5) — `server/src/middleware/rateLimit.ts` switches to `rate-limit-redis` with an in-memory fallback for `NODE_ENV !== "production"`. Keep the existing `skip: () => NODE_ENV === "test"` so the auth suite still isn't throttled. Provision Redis on Railway before this lands.

**Production migration playbook**:

- Railway server service must set its **pre-deploy command** to `cd server && bun run db:migrate`. Migrations run after build and before traffic shifts; if they fail, Railway aborts the deploy and the previous version keeps serving.
- Schema changes ship via `bun run --filter server db:generate` → review the generated SQL in `server/drizzle/` → commit alongside the schema diff. Never edit historical migration files; create a new one.
- Rollback: revert the offending migration's commit on a new PR; for data-incompatible reverts add a forward-compensating migration rather than rewriting history.
- Local bootstrap (one-time after this lands, for devs who used `db:push`): `dropdb hilom_dev && createdb hilom_dev && bun run --filter server db:migrate && bun run --filter server db:seed:all`.
- `db:push` and `db:push:test` remain in `server/package.json` as **local-only** conveniences; CI and Railway use `db:migrate`.

---

## Phase 12 — UI / UX Polish `[~]`

Elevate every screen from "functional" to "portfolio-ready." The focus is visual hierarchy, mobile-first responsiveness, and making the app feel like a real healthcare product at every touchpoint.

> Slices A (dashboards), B (appointments/payments/profile/prescriptions), and C (reviews/admin) shipped. Dashboards still feel sparse and admin-panel-like — Phase 13 takes the second pass before the live deploy.

**Files**:

- `client/src/pages/dashboard/PatientDashboard.tsx`
- `client/src/pages/dashboard/DoctorDashboard.tsx`
- `client/src/pages/dashboard/AdminDashboard.tsx`
- `client/src/features/profile/pages/ProfileSetupPage.tsx`
- `client/src/features/appointments/components/AppointmentCard.tsx`
- `client/src/features/appointments/pages/DoctorAppointmentsPage.tsx`
- `client/src/features/payments/pages/PaymentPage.tsx`, `MyPaymentsPage.tsx`
- `client/src/features/prescriptions/pages/ViewPrescriptionPage.tsx`, `WritePrescriptionPage.tsx`
- `client/src/features/admin/pages/AdminStatsPage.tsx`, `UserManagementPage.tsx`, `DoctorVerificationPage.tsx`
- `client/src/features/reviews/components/DoctorReviewsSection.tsx`

**Done when**:

- [x] PatientDashboard: stat tiles with color accents (appointments this month, prescriptions count), upcoming appointment card shows doctor avatar + date countdown, quick-book section with specialty chips
- [x] DoctorDashboard: earnings tile with trend indicator, today's schedule as timeline (not flat list), pending confirmations badge with urgency color
- [x] AdminDashboard: KPI grid (total users, active doctors, revenue, unverified queue), unverified doctors row shows photo + license date
- [x] AppointmentCard: status indicator with color (initial: left border; final: avatar + dot badge), action buttons grouped cleanly
- [x] ProfileSetupPage: multi-step feel with progress indicator, field groups visually separated
- [x] PaymentPage: clear payment method selector with GCash/Maya/card icons, escrow explainer inline
- [x] ViewPrescriptionPage: print-friendly layout, medication list as styled rows not raw text
- [x] WritePrescriptionPage: medication rows have better visual separation, clear add/remove affordance
- [x] DoctorReviewsSection: star distribution bar chart, reviewer avatar + date
- [x] Admin pages: skeleton loading, empty states with icons (bulk action affordance deferred)
- [x] All pages: consistent page header pattern (title + optional subtitle + optional action button)
- [x] All loading states: skeleton UI (no plain "Loading…" text anywhere)
- [x] All empty states: icon + message + contextual CTA (no plain text-only empty states)

**Migrate server tests to PGLite (in-memory Postgres)**:

- [ ] Add `@electric-sql/pglite` as devDependency
- [ ] Replace pg.Pool with PGLite-backed adapter for test env in `server/src/config/db.ts`
- [ ] Drop the `postgres` GitHub Actions service from `.github/workflows/ci.yml`
- [ ] Drop `bunx drizzle-kit push` step (PGLite gets schema applied in test setup)
- [ ] Verify all test files pass with PGLite

**Why:** Tests currently spin up a real Postgres container per CI run + share a Pool across test files. PGLite runs Postgres in-memory in the same Node process, eliminating both the container boot time (~10-15 s) and the cross-file connection-pool memory accumulation that forced `pool: "forks" + fileParallelism: false`. Expected wins: faster CI, simpler config, lower memory ceiling.

---

## Phase 13 — Pre-launch Dashboard & UX 2.0 `[ ]`

The Slice A/B/C polish made screens consistent, but dashboards still feel like an admin panel — sparse, vanity-metric tiles, no personality, no inline actions. This phase is the final pass _before_ Phase 11 Deploy: make the patient/doctor home pages feel like a real healthcare product so the live demo lands well.

> **Order matters: Phase 13 ships before Phase 11 Deploy.** Going live with the current dashboards undersells the rest of the work.

**Files**:

- `client/src/pages/dashboard/PatientDashboard.tsx`
- `client/src/pages/dashboard/DoctorDashboard.tsx`
- `client/src/features/dashboard/components/GreetingHeader.tsx` _(new)_
- `client/src/features/dashboard/components/UpcomingHero.tsx` _(new)_
- `client/src/features/dashboard/components/RecentDoctorsRow.tsx` _(new)_
- `client/src/features/dashboard/components/SpecialtyGrid.tsx` _(new)_
- `client/src/features/specializations/api.ts` _(extend — return doctor count per specialty)_
- `server/src/controllers/specialization.controller.ts` _(extend — `LEFT JOIN doctor_profiles` + count, `WHERE is_verified = true`)_
- `client/src/features/messages/hooks.ts` _(add `useUnreadCount` for actionable tile)_

**Patient dashboard — Done when**:

- [ ] **Greeting header**: "Good morning/afternoon/evening, {firstName}" + today's date (locale-aware), optional subtle illustration or accent
- [ ] **Hero upcoming-appointment card**: doubled in visual weight (larger avatar, larger date/time, full-width). Shows inline actions directly: `[Pay now]` (if pending payment), `[Chat]` (if confirmed), `[Reschedule]`, `[View prescription]` — patient never has to leave the dashboard for the next action
- [ ] **Actionable stat tiles** (replace vanity metrics): "Active prescriptions" (with refill CTA when any nearing end-date), "Unread messages" (with deep-link to chat), "Last visit" (relative time + "Book again")
- [ ] **Recent doctors row**: avatar grid (h-12 w-12) of last 3-4 doctors the patient has seen, click → doctor detail with "Book again" pre-filled
- [ ] **Specialty grid**: replace hardcoded `SPECIALTIES = [...]` array with API data, show doctor count per specialty (`Cardiology · 12 doctors`), use small Lucide icons per specialty
- [ ] **Empty-state polish**: when patient has no history, hero shows "Book your first visit" CTA + an illustration; recent-doctors row hidden; specialty grid still visible

**Doctor dashboard — Done when**:

- [ ] **Greeting header**: same pattern, "Dr. {lastName}" with today's date
- [ ] **Today's schedule as a true timeline**: vertical timeline with hour markers (08, 09, 10, …), appointments as cards anchored to slot times, gaps visible (so "free slot from 11–12" is obvious)
- [ ] **Pending confirmations stays prominent** with urgency dot when older than 24 h
- [ ] **"Quick reply" message tile**: shows count of unread chats with patient avatar previews, click → conversation
- [ ] **Earnings tile**: keep, but add 7-day sparkline (small inline SVG, no chart library)

**Cross-cutting**:

- [ ] Server: `GET /api/specializations` returns `{ id, name, doctorCount }` (count of verified doctors per specialty); existing callers still work because new field is additive
- [ ] Server: `GET /api/messages/unread-count` returns total unread count for the user (or extend existing endpoint)
- [ ] Client: dashboards use `Suspense`-style skeleton sections (each section loads independently — greeting renders instantly, hero waits for appointments, specialty grid waits for API)
- [ ] Mobile: every section stacks cleanly under 375 px; hero card stays single column, recent-doctors row scrolls horizontally
- [ ] No new heavy deps (no chart library — sparkline is hand-drawn SVG, illustration is a Lucide icon at large size or inline SVG)

**Optional stretch**:

- [ ] "Health tip of the day" surface (rotating static content) — low effort, adds warmth
- [ ] Patient: "Refill due in 3 days" banner if any prescription medication has duration nearing expiry (computed client-side from `prescriptionMedications.duration` + issue date)

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
