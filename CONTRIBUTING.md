# Contributing

## Local setup

```bash
bun install
bun run --filter server db:push       # push schema to local PG
bun run --filter server db:seed       # seed specializations
bun run --filter server db:seed:doctor # demo doctor (Mon-Fri schedule, verified)
# Optional: seed an admin
bun run --filter server db:seed:admin -- --email=admin@hilom.local --password=Admin1234

bun run dev   # client (5173) + server (4000)
```

## Tests

| Layer                     | Command                                 | Speed             |
| ------------------------- | --------------------------------------- | ----------------- |
| Server unit + integration | `bun run --filter server test`          | ~3 min            |
| Server coverage           | `bun run --filter server test:coverage` | ~3 min            |
| Client unit + component   | `bun run --filter client test`          | ~10 s             |
| Client coverage           | `bun run --filter client test:coverage` | ~15 s             |
| E2E (Playwright)          | `bun run test:e2e`                      | ~30 s + spec time |

E2E uses port 5174 (client) and 4001 (server) so it can run alongside a
dev session on the default ports.

## Coverage

Coverage reports land in `server/coverage/` and `client/coverage/`.

- **No threshold gate yet.** Both configs emit reports without enforcing a
  number. Once you run `test:coverage` once and have a baseline, add a
  ratchet: each PR can move the floor up; never down.
- Excluded from server coverage: seeds (`db/seed*.ts`), entry point
  (`index.ts`), generated types, the logger config.
- Excluded from client coverage: `main.tsx`, `App.tsx`, the test/ folder.

## Code rules

- **No `as` / `any`.** Use `unknown` + narrowing or Zod schemas. Only
  `as const` is allowed.
- **150-line sweet spot, 300-line hard cap.** Split when a file outgrows
  one screen of focused code.
- **Feature-based folders.** Per-feature code under `features/<name>/`,
  cross-cutting in `lib/`, shared UI in `components/ui/`.
- **Mobile-first.** Default styles target ≤sm; scale up with
  `sm: md: lg:`. Min 44px tap targets.
- **No bare `console.log` in committed code.** Server uses pino; client
  has react-query devtools in dev only.

The pre-commit hook (`.husky/pre-commit`) runs typecheck + lint-staged
(eslint + prettier) before every commit. The commit-msg hook enforces
conventional-commits via commitlint.

## E2E specs

Five flows:

- `auth.spec.ts` — register, dashboard renders, logout, login, wrong-password (real)
- `booking.spec.ts` — patient books a slot (stub, needs admin-bypass DB seed)
- `payment.spec.ts` — pay → escrow → release → refund (stubs)
- `chat.spec.ts` — real-time message round-trip (stub)
- `review.spec.ts` — review after completed (stub)

Stubs use `test.skip()` with TODO comments. Wire them up by:

1. Adding a DB-direct `seedVerifiedDoctor()` helper in `e2e/fixtures/`
   (admin-bypass — much faster than going through the admin seed CLI).
2. Filling the spec body, removing `.skip`.

Don't add a spec unless it covers a flow the integration tests can't
catch (real-time UI, multi-tab, navigation).

## CI

Two jobs in `.github/workflows/ci.yml`:

- **build** (every push + PR) — typecheck, lint, server tests, client
  tests. Uploads `server/coverage` and `client/coverage` as artifacts.
- **e2e** (PR only) — Playwright against Chromium. Uploads
  `playwright-report` on failure.

E2E is PR-only because a single run is ~3 minutes and feature branches
can have many pushes. Branch protection still requires the PR check.
