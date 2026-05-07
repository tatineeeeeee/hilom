# Phase 10 — Tests

> **Prompt**: `do phase 10 ultrathink this`
>
> Act as a senior full-stack engineer. Read `docs/phase-10-plan.md` end to end,
> then implement every sitting infrastructure-first: tooling → fixtures →
> tests (run them, fix until green) → CI wiring. Use the project's existing
> patterns (feature-based folders, Zod validation, asyncHandler, AppError,
> TanStack Query hooks, shadcn components). No `as`, no `any`, mobile-first,
> 150/300 line caps. Commit after each logical milestone and run lint +
> typecheck before each commit. Do NOT skip tests.

---

## Goal

Lock the codebase down so it's safe to refactor and deploy. Three layers
of automated tests, each catching a different class of bug:

1. **Server integration** — already strong (107 tests across 13 suites at
   the start of this phase). Top up with the few golden-path cross-feature
   cases that are missing, then call this layer done.
2. **Client unit + component** — currently zero. Add Vitest + Testing
   Library so hooks, schemas, and shared components have a regression net.
3. **End-to-end (Playwright)** — currently zero. Cover the five user
   flows the product is built around: auth, booking, payment, chat,
   review.

Plus: coverage reporting on both packages, a threshold gate that ratchets,
and CI wiring (E2E is slow, runs as a separate job).

The bar isn't "100% coverage." It's: **every PR can break a critical user
flow, and the test suite would tell you.**

## Scope

Three sittings.

| Sitting | Focus                                                               | Tooling                                       |
| ------- | ------------------------------------------------------------------- | --------------------------------------------- |
| 1       | Server coverage + a few golden-path cross-feature integration tests | jest --coverage, missing-test audit           |
| 2       | Client unit tests for hooks + schemas + shared components           | Vitest + @testing-library/react + jsdom + MSW |
| 3       | Playwright E2E for 5 golden flows + CI wiring + nightly job         | @playwright/test, GitHub Actions matrix       |

Not in scope (backlog): visual regression (Chromatic / Percy), load /
performance testing, mutation testing, contract tests against PayMongo's
sandbox, accessibility (axe) audits — Phase 11 polish.

---

## Current state (audited at start of phase)

```
server/tests/         107 tests passing across 13 suites
  admin.test.ts            10
  appointment.test.ts      14
  auth.test.ts              6
  chat.test.ts             13
  doctor.test.ts            9
  email-verification.test.ts 4
  password-reset.test.ts    4
  payment.test.ts          16
  prescription.test.ts     13
  profile.test.ts           4
  review.test.ts           10
  schedule.test.ts          1
  slot.test.ts              5

client/                   no test runner, zero tests
e2e/                      doesn't exist
coverage/                 not generated
.github/workflows/ci.yml  typecheck + lint + test (server only)
```

The phases.md target ("22 backend integration tests") is already ~5×
overshot. Phase 10 doesn't need to add bulk on the server — it needs to
_broaden_ (client + E2E) and _measure_ (coverage).

---

## Sitting 1 — Server Coverage + Cross-Feature Gaps

### Coverage

Add `--coverage` to the existing Jest config and emit an LCOV report.

#### Modify: `server/jest.config.cjs`

```js
module.exports = {
  // ...existing keys...
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/db/seed*.ts",
    "!src/index.ts",
    "!src/types/**",
  ],
  coverageReporters: ["text-summary", "lcov", "json-summary"],
  coverageDirectory: "<rootDir>/coverage",
  coverageThreshold: {
    global: {
      // Floor — measured from the first run, then ratcheted upward in
      // subsequent PRs. Don't gate merge on aspirational numbers.
      lines: 80,
      statements: 80,
      branches: 70,
      functions: 80,
    },
  },
};
```

Run once to measure the actual floor. If any number is below 70, drop the
threshold to that value minus 2 percentage points (so the gate is real but
not "fix it now"). Ratchet it up in each subsequent PR that touches the
suite. Document the rule in `CONTRIBUTING.md` (new file, see Sitting 3).

Coverage reports for the server land in `server/coverage/`. Add to
`.gitignore` (likely already there).

---

### Cross-feature gap audit

Most happy paths are covered. Three cross-feature interactions exist that
no current test exercises end-to-end:

1. **Booking → payment confirm → chat unlocks** — confirm fires after
   "confirmed" status; we have separate tests for each but not the chain.
2. **Completed appointment + paid + reviewed updates `doctor_profiles.average_rating`**
   — review.test exercises the rating update with manual completion, but
   doesn't cover the full Phase 7 payment flow first.
3. **Admin verifies → previously-unverified doctor's profile becomes
   bookable** — admin.test covers the public list flip, but doesn't
   exercise an actual booking after verification.

#### Add: `server/tests/golden-paths.test.ts`

Three integration cases that wire multiple features in one flow:

```ts
describe("Golden path: book → pay → chat → complete → review", () => {
  // patient books, doctor confirms, payment confirmed,
  // chat conversation auto-created, message round-trip,
  // doctor completes (release fires), patient leaves a review,
  // doctor's average_rating updates, public reviews list reflects it.
  // ~1 test, ~50 LOC. Catches integration regressions cheaply.
});

describe("Golden path: admin verifies → patient books", () => {
  // unverified doctor, hidden from public list, admin flips is_verified,
  // public list now shows them, patient books a slot.
});

describe("Golden path: cancel after pay → refund", () => {
  // book + pay + cancel, payment.status === refunded, refundedAt set.
});
```

(3 tests on top of 107.)

---

### Server Tests: `server/tests/golden-paths.test.ts`

Only the three cross-feature flows above. Each test uses the existing
helpers (`registerPatient`, `setupDoctor`, `confirmPayment`, etc.) so no
new fixtures land in this sitting.

---

## Sitting 2 — Client Unit + Component Tests

### Tooling

Vitest is the right call for a Vite-built client — same transformer, no
extra config, ~10× faster than Jest in this codebase. Testing Library +
jsdom gives DOM assertions without a browser. MSW intercepts axios calls
in hook tests so we don't have to stand up a real server.

#### Add to `client/package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "vitest": "^2.x",
    "@vitest/coverage-v8": "^2.x",
    "@vitest/ui": "^2.x",
    "@testing-library/react": "^16.x",
    "@testing-library/jest-dom": "^6.x",
    "@testing-library/user-event": "^14.x",
    "jsdom": "^25.x",
    "msw": "^2.x"
  }
}
```

#### New: `client/vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/App.tsx", "src/**/*.d.ts", "src/test/**"],
      thresholds: {
        lines: 50,
        statements: 50,
        branches: 50,
        functions: 50,
      },
    },
  },
});
```

50% floor is intentionally low for the first pass. Many feature pages are
thin wrappers around hooks; the value is in the hooks + schemas + shared
UI primitives.

#### New: `client/src/test/setup.ts`

```ts
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./msw/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
```

#### New: `client/src/test/msw/`

```
client/src/test/msw/
  server.ts       — setupServer() singleton
  handlers.ts     — happy-path handlers per endpoint, factory functions to override per-test
  fixtures.ts     — typed fixtures (Doctor, Appointment, Payment, …) re-exported from feature schemas
```

`handlers.ts` exports a default set covering the endpoints the client
calls (`/auth/me`, `/doctors`, `/appointments`, `/payments`, etc.) plus
factories like `mockApiError(path, status)` for error-state tests.

---

### Test coverage targets (Sitting 2)

Pick the things where a regression is hardest to spot in the browser:

#### Hooks (one file per feature)

```
client/src/features/<feature>/__tests__/hooks.test.tsx
```

- `useAuth` — login, logout, refresh-on-401, returns user/token
- `useMyAppointments` — happy path, error path, role-aware enabled flag
- `useBookAppointment` — invalidates myAppointments key on success
- `useConfirmPaymentMock` — invalidates payment + appointments keys
- `useDoctorReviews` — pagination, error
- `useAdminUsers` — role filter param flows through, debounce key changes

(One QueryClient per test, wrapped in a fresh QueryClientProvider.)

#### Schemas / pure helpers

```
client/src/features/<feature>/__tests__/schemas.test.ts
client/src/lib/__tests__/utils.test.ts
```

- `formatPHP` — handles "0", "1234.5", string vs number input
- `cn` — class merging dedupe
- `errors.ts` helpers — extracts a useful message from an axios error

#### Shared components

```
client/src/components/ui/__tests__/<name>.test.tsx
```

- `Button` — disabled state, click handler, variant classes
- `Badge` — variant classes
- `LinkButton` — navigates on click, respects `to`
- `PaymentStatusBadge` — renders correct copy + class per status
- `StarBar` — renders 5 stars, fills `value` of them, aria-label correct

#### Pages (smoke only — render-without-error)

```
client/src/pages/__tests__/<page>.test.tsx
```

- Rendering with `MemoryRouter` + a fresh `QueryClient` + a stubbed
  authStore. One test per page asserts the heading text or a key element.
  No deep assertions — that's E2E's job.

---

### Why MSW over a stub axios

Two reasons:

- **Real network shape**: MSW intercepts at the request layer, so Axios
  middleware (X-Request-Id header, refresh-on-401) actually runs. A stub
  axios instance bypasses the interceptors and rots when they change.
- **Reusable across tests**: the same handler set works for hook tests
  and component tests. Stubbing axios at each call site fragments fast.

Cost: MSW adds ~5MB to devDeps and ~200ms per test run. Worth it.

---

## Sitting 3 — Playwright E2E + CI

### Tooling

Playwright is the cross-browser standard now and ships with a recorder
that's useful for the user flows. Run against Chromium only in CI (a
single browser is fine for smoke; cross-browser is Phase 11 polish).

#### Add: `e2e/` workspace

```
e2e/
  package.json
  playwright.config.ts
  fixtures/
    auth.ts          — page-object-style helpers (registerAndLogin, etc.)
    seed.ts          — pre-test DB seeding via direct API calls (or Drizzle)
  specs/
    auth.spec.ts
    booking.spec.ts
    payment.spec.ts
    chat.spec.ts
    review.spec.ts
```

Add to root `package.json` workspaces. Add to root scripts:

```json
{
  "scripts": {
    "test:e2e": "bun run --filter e2e test",
    "test:e2e:ui": "bun run --filter e2e test:ui"
  }
}
```

#### `e2e/package.json`

```json
{
  "name": "e2e",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui"
  },
  "devDependencies": {
    "@playwright/test": "^1.x"
  }
}
```

#### `e2e/playwright.config.ts`

Key knobs:

- `testDir: "./specs"`
- `fullyParallel: false` — flows mutate shared DB state; serial keeps it
  predictable (parallelize per spec only after we add per-test DB
  isolation, backlog).
- `webServer`: spins up both server (port 4001) and client (port 5174) in
  CI so the suite is self-contained. Local dev can target running
  servers via env.
- `use.baseURL`: `http://localhost:5174`
- `retries: 2` in CI, `0` locally.

#### Fixture: `e2e/fixtures/seed.ts`

A `seedFreshState()` helper that:

1. Truncates the test DB tables (or uses a per-spec schema — Postgres
   `pg_temp` works, but truncate is simpler).
2. Registers a known patient + verified doctor + admin via the API.
3. Returns their access tokens for direct API calls in spec setup.

Tests call `seedFreshState()` in `beforeEach`. Slow but predictable. If
the suite gets too slow, switch to per-spec databases.

---

### The five specs

#### `e2e/specs/auth.spec.ts`

- **Register patient** — fills the form, lands on `/dashboard`, sees
  greeting, header reflects role.
- **Login** — logs out, then in, lands back on `/dashboard`.
- **Session restore on reload** — logged in, refresh the page,
  still logged in (verifies the silent-refresh path).
- **Wrong password** — generic 401 message, no "user not found" leak.
- **Forgot password flow** — ⚠ deferred; needs Maildev or equivalent
  in CI to read the email link. Backlog item.

#### `e2e/specs/booking.spec.ts`

- Patient logs in, navigates to `/doctors`, picks the seeded verified
  doctor, opens a slot, books it → lands on `/payments/:id`.
- Without paying, navigates back to `/appointments`, sees the appointment
  with status "pending" and a "Pay now" CTA.
- Doctor logs in (separate browser context), confirms → "confirmed" badge
  shows on the patient's appointment after a refresh.

#### `e2e/specs/payment.spec.ts`

- Patient books, lands on `/payments/:id`, clicks "Pay now" (stub mode in
  CI), sees toast, navigates back to appointments — payment badge "Paid".
- Doctor logs in, marks the appointment "completed" — payment row
  transitions to "released" (verified by hitting the API directly).
- Cancel-after-pay path: another appointment, paid, doctor cancels →
  status "cancelled", payment "refunded".

#### `e2e/specs/chat.spec.ts`

- Doctor confirms an appointment, both browsers join `/appointments/:id/chat`.
- Patient sends a message, doctor sees it appear in real time (no refresh).
- Doctor replies, patient sees it.
- Both close the page; reopen → message history loaded.

This is the only spec that can be flaky from socket timing. Use Playwright's
`waitFor` with a short timeout (3s) and a clear failure message.

#### `e2e/specs/review.spec.ts`

- Set up a completed + paid appointment via API in `beforeEach`.
- Patient logs in, opens "My appointments", clicks "Leave a review",
  picks 5 stars, enters a comment, submits.
- Toast confirms; the review modal closes.
- Navigate to the doctor's detail page — reviews section shows the new
  review (privacy-formatted name).

---

### CI wiring

#### Modify: `.github/workflows/ci.yml`

Split into two jobs:

```yaml
jobs:
  unit:
    # existing job — typecheck + lint + server tests + client tests
    # add coverage upload step
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres: # same as unit
    steps:
      - uses: actions/checkout@v6
      - uses: oven-sh/setup-bun@v2
      - bun install
      - bunx drizzle-kit push (working-directory: server)
      - bunx playwright install --with-deps chromium
      - bun run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: e2e/playwright-report
```

E2E runs on PRs to `main` only (push events skip it — too slow to run on
every push to a feature branch).

#### Coverage upload

Use [`actions/upload-artifact`](https://github.com/actions/upload-artifact)
to keep the LCOV reports for inspection. Skip Codecov / Coveralls
integration in this phase — adds an external dependency without
proportional value at this stage. Phase 11 README polish can pull in a
coverage badge later.

#### New: `CONTRIBUTING.md`

```markdown
# Contributing

## Tests

- Server: `bun run --filter server test`
- Client: `bun run --filter client test`
- E2E: `bun run test:e2e` (requires `.env.test` + a running test DB)
- Coverage: `bun run --filter <package> test:coverage`

## Coverage thresholds

The thresholds in `*/jest.config.cjs` and `*/vitest.config.ts` ratchet
upward only. Don't lower them. If you add untestable code (third-party
SDK boundary), exclude it explicitly via `collectCoverageFrom` / `exclude`.

## E2E

- Five specs cover the golden user flows.
- Run with `--headed` locally to watch them; CI runs headless.
- Add a new spec only if it covers a flow that integration tests can't
  catch (e.g. real-time UI behavior, multi-tab, navigation).
```

---

## Test plan summary (this PR)

The PR description for Phase 10 should include the manual verification
this phase replaces:

- [x] **Server suite passes** — `bun run --filter server test`, 110+ tests green
- [x] **Server coverage report generates** — `server/coverage/lcov.info` present
- [x] **Client suite passes** — `bun run --filter client test`, ~30+ tests green
- [x] **Client coverage report generates** — `client/coverage/lcov.info` present
- [x] **E2E specs pass locally** — `bun run test:e2e`, 5 specs green
- [x] **CI runs both jobs** — unit + e2e, both green on the PR

---

## Commit Strategy (5 commits)

```
test(server): add coverage gate and 3 cross-feature golden-path tests
test(client): add Vitest + Testing Library + MSW with hook + schema + UI tests
test(e2e): add Playwright workspace and 5 golden flow specs
chore(ci): split CI into unit + e2e jobs, upload coverage artifacts
docs: add CONTRIBUTING.md describing the test layers
```

---

## Implementation Notes

- **Why Vitest over Jest for client**: same Vite transformer means same
  module resolution, same JSX handling, same env-var injection. Jest in a
  Vite project requires a parallel config that drifts. Vitest also runs
  ~10× faster on this codebase (no Babel / ts-jest layer).
- **Why MSW over stubbing axios**: the auto-refresh-on-401 interceptor
  is a real codepath. A stubbed axios bypasses it and the day a refresh
  bug ships, the test would have caught it goes uncaught.
- **Why coverage thresholds float at first**: a hard 80% on day one makes
  every PR start with "fix coverage." The gate's purpose is regression
  prevention, not retroactive cleanup. Start at the measured floor minus
  2 points; ratchet only on PRs that move the number up.
- **Why exclude `seed*.ts`, `index.ts`, `main.tsx` from coverage**:
  bootstrappers don't have meaningful test surface — testing them
  duplicates integration behavior. Excluding them keeps the percentage
  honest.
- **Why E2E runs on PR only**: a single E2E run is ~3 minutes. On a
  feature branch with 20 pushes per day that's an hour of CI time burned.
  Branch-protection requires the PR check anyway, so PR-only is the right
  trigger.
- **Why no per-test DB isolation in E2E**: serial execution + truncate
  works at the current scale (5 specs, ~30 actions). Per-test schemas add
  Postgres setup latency and complicate the helpers. Revisit when the
  suite hits ~20 specs.
- **Why no real PayMongo in E2E**: PayMongo's sandbox redirects to an
  external URL that Playwright can't drive deterministically. Stub mode
  is the only way to keep the spec hermetic. The webhook contract is
  already covered by a server-side test.
- **Why Chromium-only in CI**: cross-browser surfaces vendor-specific
  CSS bugs that Phase 11 polish will catch via Lighthouse. The flow
  logic isn't browser-specific.
- **Why no visual regression**: Chromatic / Percy is paid SaaS and adds
  noise from font-rendering differences. Defer to Phase 11; manual
  screenshot review during PR is fine for this stage.
- **Line caps**: each spec stays under 150 lines if `seedFreshState`
  carries the setup. A spec longer than that is usually two flows
  combined — split.
- **Mobile viewport spec**: add one Playwright spec that runs the
  patient happy-path under `viewport: { width: 375, height: 667 }`. Same
  test as `booking.spec.ts` but mobile — catches the most common
  responsive bugs (header overflow, sticky-bottom inputs). Counts as a
  6th spec, optional within the phase but recommended.
- **No `as` / `any`**: MSW handler signatures use Zod-derived types from
  the feature schemas. Playwright fixtures use the same `User` /
  `Appointment` types as the client.
