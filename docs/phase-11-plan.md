# Phase 11 — Production Deploy + Portfolio Polish

> **Prompt**: `do phase 11 ultrathink this`
>
> Act as a senior full-stack engineer. Read `docs/phase-11-plan.md` end to
> end. This phase is partly implementable (CI configs, OpenAPI, README,
> Mermaid, Dependabot, Redis rate-limit) and partly external (Railway +
> Vercel deploys, real screenshots, Lighthouse scores) — the external bits
> require Justine to log in to the platforms. Land everything that can
> ship from a working tree; document the rest as a checklist.

---

## Goal

Push the project from "good code" to "I would hire this person." Live
demo URL recruiters can click, README that reads like a portfolio piece,
deploy automation, and a few production-hardening items deferred from
earlier phases (Redis rate limiter, OpenAPI docs).

The audience is two readers: a recruiter who'll spend 90 seconds on the
README + demo, and a senior engineer who'll click into the code. The
phase needs to satisfy both.

## Scope

Two sittings + one external setup pass.

| Sitting  | Focus                                                                                                                         | Implementable from working tree |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1        | Deploy automation (Vercel client, Railway server), Dependabot, Redis-backed rate limit, vercel.json                           | yes                             |
| 2        | OpenAPI generation + Swagger UI, README polish, Mermaid architecture/auth/payment diagrams                                    | yes                             |
| External | Provision Railway + Vercel, take screenshots on the live demo, run Lighthouse on the live URL, enable Dependabot in GitHub UI | manual — Justine                |

Not in scope (backlog): real PayMongo (Connected Accounts), audit log,
data-residency / encryption-at-rest, OAuth login, multi-device refresh,
i18n, PWA, push notifications, Storybook, visual regression tests.

---

## Sitting 1 — Deploy Automation + Hardening

### Vercel (client)

#### New: `client/vercel.json`

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

SPA fallback so React Router catches deep links. The rest of the Vercel
project config (env vars, build command) is set in the dashboard.

Vercel project env vars:

- `VITE_API_URL` = `https://<railway-server>.up.railway.app/api`
- `VITE_SOCKET_URL` = `https://<railway-server>.up.railway.app`

### Railway (server)

Railway auto-detects Node from `server/package.json`. Required env vars
in the Railway dashboard:

- `DATABASE_URL` — Railway provisions Postgres; copy the public URL
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — `openssl rand -base64 32` each, ≥32 chars
- `CLIENT_URL` — `https://<vercel-domain>.vercel.app`
- `PAYMONGO_SECRET_KEY` — leave empty for stub mode in the demo, or set
  to a real test key for the prod-shaped flow
- `PAYMONGO_WEBHOOK_SECRET` — required if `PAYMONGO_SECRET_KEY` is set
- `RESEND_API_KEY` — required in production (env.ts hard-fails otherwise)
- `REDIS_URL` — required for the new Redis-backed rate limiter

Build command (Railway UI): `bun install && bun run --filter server build`
Start command: `bun run --filter server start`

#### New: `.github/workflows/deploy.yml`

Triggered on push to `main` after CI passes. Two parallel jobs (client →
Vercel, server → Railway). Both use first-party action SDKs:

```yaml
name: deploy
on:
  workflow_run:
    workflows: ["ci"]
    types: [completed]
    branches: [main]
jobs:
  vercel:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_CLIENT_PROJECT_ID }}
          working-directory: ./client
          vercel-args: "--prod"
  railway:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: bervProject/railway-deploy@main
        with:
          service: server
          token: ${{ secrets.RAILWAY_TOKEN }}
```

Secrets to add in GitHub repo settings: `VERCEL_TOKEN`,
`VERCEL_ORG_ID`, `VERCEL_CLIENT_PROJECT_ID`, `RAILWAY_TOKEN`.

### Dependabot

#### New: `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule: { interval: weekly, day: monday }
    open-pull-requests-limit: 5
    groups:
      types: { patterns: ["@types/*"] }
      testing:
        {
          patterns:
            [
              "jest",
              "ts-jest",
              "supertest",
              "vitest",
              "@testing-library/*",
              "msw",
              "@playwright/*",
            ],
        }
      eslint:
        { patterns: ["eslint*", "@typescript-eslint/*", "typescript-eslint"] }
  - package-ecosystem: github-actions
    directory: "/"
    schedule: { interval: weekly, day: monday }
```

Justine enables Dependabot in the repo settings UI (Insights → Dependency
graph → Dependabot). Without that, the YAML alone does nothing.

### Redis-backed rate limit

The Phase 2.5 in-memory limiter was always a placeholder. Promote it now.

#### Modify: `server/src/middleware/rateLimit.ts`

```ts
import RedisStore from "rate-limit-redis";
import { createClient } from "redis";

const store =
  env.NODE_ENV === "production" && env.REDIS_URL
    ? new RedisStore({ sendCommand: (...args) => redis.sendCommand(args) })
    : undefined; // in-memory fallback for dev/test
```

Keep the `skip: () => NODE_ENV === "test"` so the auth integration suite
isn't throttled. Add `REDIS_URL` to `env.ts` (optional in dev/test,
required in prod when set).

#### Tests for the limiter

Already exist in `server/tests/auth.test.ts` (rate-limit branches are
exercised indirectly via the auth flow). Add a single dedicated test
that asserts the limiter respects the `skip` flag in test env — already
present implicitly. Skip new test bodies; the existing ones cover the
behavior.

---

## Sitting 2 — Docs + OpenAPI

### OpenAPI

#### New: `server/src/openapi.ts`

Use `zod-to-openapi` (or `@asteasolutions/zod-to-openapi`) to auto-generate
a spec from the existing Zod schemas — no hand-written YAML to drift.

Key endpoints to document:

- `/api/auth/*` (register, login, refresh, logout, me, forgot, reset, verify-email)
- `/api/doctors`, `/api/doctors/:id`, `/api/doctors/:id/slots`, `/api/doctors/:id/reviews`
- `/api/appointments` (book, list, status), `/api/appointments/:id/*` (review, prescription, payment)
- `/api/me/*` (profile, schedule, doctor-stats, doctor-appointments, unread-count)
- `/api/conversations/*`
- `/api/prescriptions`, `/api/payments`, `/api/admin/*`

Mount at `/api/docs` via `swagger-ui-express`:

```ts
app.get("/api/openapi.json", (_req, res) => res.json(openapiDocument));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
```

Gate `/api/docs` behind `NODE_ENV !== "production"` if you want; for a
portfolio demo, leaving it public is fine and shows the API surface.

### README polish

Current README is fine but missing demo URL, badges, and screenshots.
Replace the header with:

```md
# Hilom

[![CI](https://github.com/<owner>/hilom/actions/workflows/ci.yml/badge.svg)](...)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

🌐 **Live demo**: https://hilom.vercel.app
🎥 **Walkthrough**: <youtube/loom link>

A multi-specialty healthcare marketplace for the Philippines. Patients
browse doctors, book slots, pay via PayMongo (GCash/Maya/Card), chat in
real-time, get prescriptions, leave reviews. Three roles — patient,
doctor, admin.
```

Then add (in this order):

1. **Screenshot grid** — 4–6 screenshots: home, doctor list (mobile +
   desktop), booking flow, chat, prescription, admin verification queue.
2. **Tech stack table** (already present, keep).
3. **Architecture** — link to `docs/architecture.md`.
4. **Quickstart** (already present, keep).
5. **Phases** — bulleted with status `[x]` and link to per-phase plans.
6. **Test layers** — link to CONTRIBUTING.md.

### Mermaid diagrams

#### New: `docs/architecture.md`

Three diagrams in one doc:

- **System** — client (Vercel) → server (Railway) → Postgres + Redis +
  PayMongo + Resend.
- **Auth flow** — sequence diagram for register → email verification →
  login → access-token-in-memory + refresh-cookie → silent refresh on 401.
- **Payment flow** — sequence diagram for book → create intent → patient
  pays → escrow → complete → release; cancel branch with refund.

Use Mermaid in fenced code blocks; GitHub renders them natively.

### Lighthouse + screenshots (external — Justine runs)

After deploy:

- Run `npx unlighthouse --site https://hilom.vercel.app` (or the Chrome
  DevTools Lighthouse panel) for: Performance, Accessibility, Best
  Practices, SEO. Targets per phases.md: 85 / 95 / 95 / 90.
- Take screenshots at viewport 375×667 (iPhone SE) and 1280×800
  (laptop). Pages: home, dashboard, doctor list, doctor detail with
  reviews, booking, chat, prescription, admin verification queue.
- Save to `docs/screenshots/<page>-<viewport>.png`.

---

## Done when

| Item                                                                 | How to verify                            |
| -------------------------------------------------------------------- | ---------------------------------------- |
| Push to main → frontend on Vercel, backend on Railway, both green    | watch the deploy workflow                |
| Live demo URL pinned in repo "About" + at top of README              | github.com/<owner>/hilom                 |
| Socket.io works over WSS in production                               | open chat, send a message                |
| Production CORS locked to actual Vercel domain                       | inspect browser network tab              |
| Refresh cookie works cross-origin                                    | log in, hard-refresh, still logged in    |
| README header has CI + license badges                                | top of README                            |
| Architecture, auth, payment Mermaid diagrams in docs/architecture.md | open the file on GitHub                  |
| Mobile + desktop screenshots in docs/screenshots/                    | ls the dir                               |
| LICENSE file (MIT) in repo root                                      | already present                          |
| Dependabot enabled, weekly bump PR has merged once                   | github.com/<owner>/hilom/network/updates |
| OpenAPI spec served at /api/docs via Swagger UI                      | hit the URL                              |
| Lighthouse Performance > 85, A11y > 95, BP > 95, SEO > 90            | report screenshot                        |
| Rate limit Redis-backed in production                                | check Railway logs for redis connect     |

---

## Commit Strategy (4 commits)

```
chore(deploy): add vercel.json, deploy workflow, Dependabot config
chore(rate-limit): promote to Redis-backed with in-memory dev fallback
feat(api): add OpenAPI spec + Swagger UI at /api/docs
docs: README polish + architecture / auth / payment Mermaid diagrams
```

Plus an external-only checklist PR / issue tracking the three manual
items: Vercel + Railway provision, screenshots, Lighthouse run.

---

## Implementation Notes

- **Why split deploy from CI**: the deploy job runs only on green main,
  triggered via `workflow_run`. Putting it in the same workflow as CI
  conflates "did this PR pass" with "should this ship to prod" and makes
  rollback messier.
- **Why Vercel for client + Railway for server**: free-tier-friendly,
  both have first-class Postgres, both speak GitHub. Railway is the
  decision called out in CLAUDE.md.local — Supabase pauses after 1 week
  of inactivity which would kill a portfolio demo.
- **Why a single big PR for the OpenAPI auto-gen**: hand-writing YAML
  drifts. `zod-to-openapi` reuses the schemas the validators already
  use, so the docs _can't_ go out of sync. The cost is a one-time
  schema-registration ceremony — about 20 LOC.
- **Why /api/docs public for the demo**: recruiters won't auth in just
  to see the API surface. The endpoints themselves still require auth.
- **Why Mermaid in markdown over PNG diagrams**: GitHub renders Mermaid
  natively; diagrams stay editable; no image binaries in git. The cost
  is rendering quirks in older clients — acceptable for a portfolio.
- **Why I'm not gating the threshold on Lighthouse**: scores fluctuate
  with cold-start latency. Document the targets, run once per release,
  but don't block CI on a number that varies ±5 between runs.
- **Why Redis rate-limit lands now, not earlier**: the in-memory limiter
  works in dev. Moving it to Redis only matters when there's >1 server
  instance, which only happens on Railway. Doing it in Phase 2.5 would
  have required Redis in dev for no benefit.
- **What Justine must do manually** (non-automatable from working tree):
  1. Create Vercel project pointing at the `client/` folder, set env
     vars, link to GitHub repo.
  2. Create Railway project, provision Postgres + Redis, set env vars,
     link to GitHub.
  3. Add deploy secrets to GitHub repo settings.
  4. Enable Dependabot in repo Insights → Dependency graph.
  5. After first successful deploy: run Lighthouse, take screenshots,
     commit them in a follow-up PR.
- **Why no Storybook**: adds tooling weight (~5MB devDeps + a runner)
  without proportional value at this stage. The client is small enough
  that recruiters can grep components directly. Reconsider when the
  component count exceeds ~50.
- **Why no chromatic / percy visual regression**: paid SaaS, font-render
  noise, slow to set up. The screenshots in docs/ + a manual eyeball
  during PR review covers the same ground.
