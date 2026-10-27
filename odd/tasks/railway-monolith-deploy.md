# Feature: railway-monolith-deploy

Deploy the product as a single Railway service: `pedidos-api` (Nest) serves both
the `/api` routes and the built SPA from `pedidos-web`. Supersedes the original
ODD-3.12 (Railway) + ODD-3.13 (Netlify) split.

## Specs

- **S1** — User request, verbatim: "vamos con el plan de deploy creo que eestaba en otra rama y habiamos quedado en que todo se despliega en railway donde nest publica el build del frontend"
- **S2** — "todo se despliega en railway donde nest publica el build del frontend": one Railway service, and Nest publishes the frontend build. The SPA-serving half already landed in `e18ed0f` (`ServeStaticModule` + Express catch-all + `prebuild` chain). What is missing is the deployment layer: build description, database connection, migration runner, runbook.
- **S3** — Build strategy, user choice: "`railpack.json` en la raíz (recomendado)". A `railpack.json` at the repo root with `"provider": "node"`, `"packages": {"node": "22"}`, explicit install commands for both projects, a build command that triggers the existing `prebuild` chain, and `"deploy": {"startCommand": "cd pedidos-api && node dist/main"}`.
- **S4** — Database, user choice: "Postgres del propio Railway (recomendado)". Railway injects a single `DATABASE_URL`; the backend must resolve it into connection fields and negotiate SSL.
- **S5** — Delivery, user choice: "Push a GitHub primero". The repo currently has no remote; Railway connects to the hosted repository.
- **S6** — Migrations must run as a Pre-deploy Command against the compiled output (`node dist/database/migrate.js`), not through `ts-node`, because the runtime image carries production dependencies only.

### Constraints that shaped this plan (verified, not assumed)

- `"builder": "NIXPACKS"` is **not** a valid value in Railway's current Config as Code schema (`RAILPACK` and `DOCKERFILE` only).
- `railway.json` / `railway.toml` is **deprecated** as Config as Code; existing files work for legacy services until **2026-12-01**. `railpack.json` is the builder's own config format and carries no such deadline. This is why S3 is `railpack.json` and not `railway.json`.
- The repo has two independent `package.json` files with no npm workspaces, so build autodetection cannot resolve the install.

## Tasks

| ID | Task | Specs | Route | Commit |
|---|---|---|---|---|
| T1 | Resolve DB config from `DATABASE_URL` with SSL toggle; keep `DB_*` working for local dev | S4 | inline | `65c9cfa` |
| T2 | Compiled migration runner + `__dirname` migration glob; seed reachable from `dist/` | S6 | inline | `049d16e` |
| T3 | `railpack.json` at root describing install, build and start | S3 | inline | `bdf972c` |
| T4 | Move the SPA plan to the tracker root; supersede ODD-3.13 in the MVP tracker | S1, S2 | inline | `3b83836` |
| T5 | Railway runbook: service setup, Postgres, env vars, pre-deploy command, healthcheck, GitHub push | S3, S4, S5 | inline | `bb682ae` |

### Progress

- **T1 done — `65c9cfa`.** 697 authored changed lines: this is the slice boundary. The unit was pushed over the ~400-line guidance by the two spec files (355 lines); the production code is 287 lines. The next work units are individually smaller.
- **T1 verified**: `npx tsc --noEmit` clean, `npx nest build` clean, full suite 133 passed / 11 suites (baseline was 92 / 9). The compiled validator resolves the Railway shape end to end — `DATABASE_URL=postgresql://ana:hunter2@db.railway.app:5432/railway?sslmode=require` produces `DB_HOST=db.railway.app DB_PORT=5432 DB_DATABASE=railway DB_SSL=true`.
- **T1 incidental proof of the precedence rule**: `npm run typeorm -- migration:show` was run with `DATABASE_URL` pointing at a dead port and still connected to the local database, reporting all 8 migrations applied — the local `.env` `DB_*` group stayed authoritative exactly as intended.
- **T1 finding — `reflect-metadata`**: `plainToInstance` needs the Reflect shim. The app bootstrap loads it, and so does the TypeORM CLI (verified: `migration:show` runs green), but a bare `node -e` harness does not. The new `validate-env.spec.ts` needs an explicit `import 'reflect-metadata'` for the same reason.
- **T2 finding — the compiled output was never reachable before this**: `data-source.ts` globbed `src/database/migrations/*.ts`, which does not exist next to `dist/`, so a Pre-deploy Command had no migrations to run at all. The glob is now anchored to `__dirname` and matches both `.ts` and `.js`, so the TypeORM CLI and the compiled runner resolve the same files from either tree.
- **T2 finding — decorators need the shim outside Nest**: `data-source.ts` and `seed.ts` now import `reflect-metadata` explicitly. Running them under plain `node` does not go through the Nest bootstrap that loads it, and the entities are decorated.
- **T2 defect caught by its own test**: the first `migrate()` draft called `initialize()` outside the `try`, so a failed connection left a half-open handle. The teardown is now unconditional and the test pins it.
- **T2 verified against the real database**, not just mocks: `npm run migration:run:dist` prints `[migrate] schema already up to date.` and `npm run db:seed:dist` prints `2 total: 0 created, 2 already existed.` — the exact pair the Pre-deploy Command will run, with no data mutated. Suite now 142 passed / 13 suites.
- **Test hygiene note**: `data-source.spec.ts` must set `DOTENV_CONFIG_PATH` to a path that does not exist. `data-source.ts` runs `import 'dotenv/config'`, which otherwise re-populates `DB_*` from the developer's real `.env` and silently wins over the URL under test.

### Critical finding — the SPA was never actually served in production

Found by the T3 boot smoke, not by any test. Shipped in `e18ed0f`.

The Express catch-all in `main.ts` was registered immediately after `NestFactory.create()`, while `ServeStaticModule` only registers its middleware during `app.init()` — which `app.listen()` triggers internally. Express evaluates middleware in registration order, so the catch-all sat *ahead* of the static handler and matched every request.

Every asset was served as `index.html`: the JS bundle, `sw.js`, `icon-192.png` and `manifest.webmanifest`. A browser would have parsed HTML as JavaScript and rendered a blank page.

The reason it survived review: the previous acceptance criterion was "`node dist/main.js` serves `/`", and `/` passes either way, because the catch-all returns `index.html` too. Checking the root cannot distinguish "static handler working" from "catch-all swallowing everything". Asset content types are the only honest check.

Fixed in `d714ed1` by calling `await app.init()` before adding the route, making the ordering explicit.

**Why there is no unit test for this**: middleware ordering is a boot-time property of the assembled Express stack. `bootstrap()` is not exported and booting `AppModule` needs a live database, so a Jest spec could only assert it through the same HTTP surface that caught it. Verified against a booted production build instead, across seven paths:

| Path | Before | After |
|---|---|---|
| `/api/health` | 200 `application/json` | unchanged |
| `/` | 200 `text/html` | unchanged |
| `/catalog` (deep link) | 200 `text/html` | unchanged, still falls back |
| `/assets/index-*.js` | 200 `text/html` | 200 `application/javascript` |
| `/sw.js` | 200 `text/html` | 200 `application/javascript` |
| `/icon-192.png` | 200 `text/html` | 200 `image/png` |
| `/manifest.webmanifest` | 200 `text/html` | 200 `application/manifest+json` |

### Verification notes

- **T3 verified end to end.** A pristine copy of the tree was extracted with `git archive` into a `mktemp -d` scratch directory (never committed as a test), the install and build commands were executed *as declared in `railpack.json`* rather than transcribed, and both artifacts were asserted present. The boot smoke then ran the file's own `deploy.startCommand`.
- **Three harness failures were mine, not the code's**, and are worth not repeating: hardcoding the DB port as 5433 (it is 5432), a placeholder `VAPID_PRIVATE_KEY` that is not 32 bytes, and running the start command from the wrong working directory when it already contains `cd pedidos-api`.
- Suite is green at 142 passed / 13 suites after every work unit.

### Task notes

- **T1** — RED first in a new `src/config/database-url.spec.ts`: parse a `postgresql://user:pass@host:5432/db` URL; reject a missing scheme; reject a URL with no host or no database; prefer `DB_*` when both are present; honour `DB_SSL=true`. `env.schema.ts` and `validate-env.ts` must accept either shape, and `data-source.ts`, `seed.ts` and `app.module.ts` consume the same resolved values.
- **T2** — `data-source.ts` currently globs `src/database/migrations/*.ts`, which does not exist under `dist/`. Replace it with a `__dirname`-relative glob that matches both, so the TypeORM CLI and the compiled runner resolve the same migrations. New `src/database/migrate.ts` runs `runMigrations()`; `nest build` compiles it to `dist/database/migrate.js` with no new dependencies.
- **T3** — Verification must run the exact commands from the file against a pristine copy of the tree (`git archive` into a `mktemp -d` scratch directory, never committed) and assert `pedidos-api/dist/main.js` and `pedidos-api/public/index.html` both exist afterwards.
- **T5** — Required env vars: `DATABASE_URL` (Railway reference to the Postgres service), `JWT_SECRET` (min 16 chars), `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `WEB_ORIGIN` (the Railway public domain, now the same origin as the API), `TZ=America/Lima`. Note that `closesAt` is `timestamp without time zone`: without `TZ` the Node process runs UTC and the auto-close comparison shifts. The `timestamptz` migration is a **separate** feature, not part of this one.

## Risk

Items 2 and 3 — T1 changes a configuration contract (`DB_*` → `DATABASE_URL`) that `data-source.ts`, `seed.ts`, `app.module.ts` and the local dev setup all consume; T2 changes how migrations resolve. Both are observable through the public start-up path, so they carry independent verification rather than inline-only checks.

### Independent verification (2026-10-20)

`gentle_review` assess returned **risk=high** with an escalation naming item 3, and required an independent verifier. `gentle-ai-verify` ran read-only against `main..HEAD` and returned **PASS on all four items**, with one change-caused advisory.

What it established beyond the writer's own claims:

- **Backward compatibility, measured differentially.** Its own probes ran against both `main` and `HEAD`: a real local `.env` using only `DB_*` resolves identically at both (the only new field is `DB_SSL: false`), and `migration:show` lists the same 8 applied migrations at both. Every `DB_*` rule that fired on `main` still fires — empty host, out-of-range or non-numeric port, partial group — and the empty `DB_PASSWORD` that trust-auth needs is still allowed.
- **SSL is plumbed, not merely stored.** Proven by failure rather than by reading: booting with `DB_SSL=true` against a plaintext cluster fails at all four DataSource sites with `The server does not support SSL connections` (app boot, `migration:show`, `migration:run:dist`, `db:seed:dist`). Unset, all four succeed.
- **The middleware fix, in both directions.** It built the same binary from `main` and booted it identically: every asset returned `200 text/html`. On `HEAD` every asset carries its own content type, `/catalog/123` still falls back, and `/api/nope` still returns a JSON 404 rather than being swallowed. `d714ed1` is the sole cause.
- **The start command's `cd` is load-bearing.** Booting the same `dist/main.js` from the repo root instead of from `pedidos-api` returns 404 for `/`, `/catalog` and `/sw.js`, because `SPA_DIR` is `process.cwd()`-relative.
- **The baseline was not eroded.** `main` measured at 92 tests / 9 suites in the same run.

**Advisory, and the one claim that turned out to be too strong:** `validateRaw()` threw on the class-validator phase before ever resolving the database, so database problems vanished from the message whenever any unrelated variable was also invalid. An env missing `JWT_SECRET` with no database config listed 11 issues on `main` and only `JWT_SECRET` on this branch. Boot still fails loudly and nothing is silently accepted, so it was non-blocking — but it degraded a diagnostic the original code deliberately provided, and the T1 commit message asserted it was preserved. It was preserved *within* the database group, not across groups. Fixed in the follow-up work unit.

**Known limit of the new middleware spec**, recorded rather than papered over: it boots a miniature replica of the `main.ts` wiring, because `bootstrap()` cannot be imported and booting `AppModule` needs a live database. It pins the mechanism — after-init serves real content types, before-init swallows them — but a regression in the literal `main.ts` sequence would not fail it. Binding it to production wiring means extracting the fallback registration into its own module; that is future work, and the seven-path HTTP check remains the real guard.

Advisories considered and not acted on: `caches.npm-install.directory: "/root/.npm"` is builder-image specific and unverifiable offline (it did not interfere with a real `npm ci` during the scratch build), and a stray root-level `.ts` file shifting tsc's inferred `rootDir` became a task in the follow-up unit.

### Follow-up unit — closing the verifier's findings (`15d1c08`)

All four items the verifier handed back are closed. Suite is now **147 passed / 14 suites**.

- `spa-fallback-order.spec.ts` boots a DB-free miniature of the `main.ts` wiring and pins *both* orderings — catch-all before init serves `/sw.js` as `text/html`; after init it serves `application/javascript` and `/catalog` still falls back. This is the regression guard `d714ed1` lacked.
- `validateRaw()` now runs both validation phases and throws once, so the cross-group regression above is fixed and pinned.
- A field rejected by both phases is reported once. `DB_PORT=99999` fails the `@IsPort` range check *and* the resolver's own range check; the first draft of that dedupe carried a defensive fallback that re-inserted the duplicate in exactly the case the dedupe existed to handle. The fallback was unnecessary and was removed: when every resolver issue is a duplicate, each one already corresponds to a schema issue present in the message.
- `tsconfig.build.json` pins `"include": ["src/**/*"]`. No stray root-level `.ts` exists today, so this is hardening against a failure mode that would break the start command.

**What an operator now sees**, both groups in one message and `DB_PORT` named once:

```
Invalid environment configuration:
  - DB_PORT: DB_PORT must be a port
  - JWT_SECRET: JWT_SECRET must be longer than or equal to 16 characters
```

**Carry-over worth remembering:** a plain ts-node harness without `import 'reflect-metadata'` produces *false* equivalence results against this validation code. The first `validateSync` call succeeds and every later one throws `Reflect.getMetadata is not a function`, which masks differences as identical. Any ad-hoc differential harness needs the shim, not just the committed specs.

### First production build — two independent causes, both in the build description (`a64d263`)

The first deploy failed before the app ever started. The evidence:

```
Failed to initialize provider `node`: error reading root package.json:
open .../snapshot-target-unpack/package.json: no such file or directory
npm error enoent Could not read package.json: ENOENT ... /app/pedidos-api/package.json
```

1. **No root manifest.** Railpack's node provider initialises from a `package.json` at the build root. The two projects live in subdirectories with no workspaces, so the provider never came up. Fixed with a minimal root `package.json` and `package-lock.json` — no dependencies, the subprojects keep their own.
2. **No edge in the step graph.** `steps` in `railpack.json` is a dependency graph, not a list of phases. `build` declared no `inputs`, so it had no ordering guarantee against `install`; the two started a millisecond apart and the build hit files that did not exist yet. Fixed with explicit edges: `install` → `build` → `deploy`.

**The lesson that cost the most:** the scratch verification executed the commands *in the order this document chose*, so it could not have caught that the builder would run them concurrently. It validated shell syntax, not builder semantics. The graph is the thing under test and only the builder can exercise it — which is why the first real deploy is the first honest test of this file.

Also found and fixed in the service configuration: the Pre-deploy Command and the healthcheck path were both unset, and auto-deploy was disabled, so a push to `main` did not trigger a build at all.

## Follow-ups deliberately left out of scope

- Migrate `products.closesAt` from `timestamp without time zone` to `timestamptz` and drop the `TZ` workaround. Data-affecting, so it is its own feature.
- E2E tests for the auth cycle (inherited since 2026-10-13).
- Prune of the `DEV` dependency set in the runtime image.
- Extracting the SPA fallback registration out of `bootstrap()` so the ordering spec binds to production wiring instead of a replica (see the known limit above).

## Log

- **L1** (2026-10-20) — "vamos con el plan de deploy creo que eestaba en otra rama y habiamos quedado en que todo se despliega en railway donde nest publica el build del frontend"
- **L2** (2026-10-20) — Corrections before planning: `NIXPACKS` is no longer a valid Railway builder and `railway.json`/`railway.toml` is deprecated until 2026-12-01. User re-selected the build strategy as `railpack.json` after being shown the correction.
- **L3** (2026-10-20) — Verified while resuming: the SPA plan lives at `pedidos-web/odd/tasks/spa-static-serving.md` (wrong directory), the branch `feat/spa-static-serving` is already merged into `main` as `e18ed0f`, and `odd/tasks/pedidos-panaderia-mvp.md` still lists ODD-3.13 (Netlify) as pending. No deploy branch exists.