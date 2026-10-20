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
| T2 | Compiled migration runner + `__dirname` migration glob; seed reachable from `dist/` | S6 | inline | pending |
| T3 | `railpack.json` at root describing install, build and start | S3 | inline | pending |
| T4 | Move the SPA plan to the tracker root; supersede ODD-3.13 in the MVP tracker | S1, S2 | inline | pending |
| T5 | Railway runbook: service setup, Postgres, env vars, pre-deploy command, healthcheck, GitHub push | S3, S4, S5 | inline | pending |

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

### Task notes

- **T1** — RED first in a new `src/config/database-url.spec.ts`: parse a `postgresql://user:pass@host:5432/db` URL; reject a missing scheme; reject a URL with no host or no database; prefer `DB_*` when both are present; honour `DB_SSL=true`. `env.schema.ts` and `validate-env.ts` must accept either shape, and `data-source.ts`, `seed.ts` and `app.module.ts` consume the same resolved values.
- **T2** — `data-source.ts` currently globs `src/database/migrations/*.ts`, which does not exist under `dist/`. Replace it with a `__dirname`-relative glob that matches both, so the TypeORM CLI and the compiled runner resolve the same migrations. New `src/database/migrate.ts` runs `runMigrations()`; `nest build` compiles it to `dist/database/migrate.js` with no new dependencies.
- **T3** — Verification must run the exact commands from the file against a pristine copy of the tree (`git archive` into a `mktemp -d` scratch directory, never committed) and assert `pedidos-api/dist/main.js` and `pedidos-api/public/index.html` both exist afterwards.
- **T5** — Required env vars: `DATABASE_URL` (Railway reference to the Postgres service), `JWT_SECRET` (min 16 chars), `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `WEB_ORIGIN` (the Railway public domain, now the same origin as the API), `TZ=America/Lima`. Note that `closesAt` is `timestamp without time zone`: without `TZ` the Node process runs UTC and the auto-close comparison shifts. The `timestamptz` migration is a **separate** feature, not part of this one.

## Risk

Items 2 and 3 — T1 changes a configuration contract (`DB_*` → `DATABASE_URL`) that `data-source.ts`, `seed.ts`, `app.module.ts` and the local dev setup all consume; T2 changes how migrations resolve. Both are observable through the public start-up path, so they carry independent verification rather than inline-only checks.

## Follow-ups deliberately left out of scope

- Migrate `products.closesAt` from `timestamp without time zone` to `timestamptz` and drop the `TZ` workaround. Data-affecting, so it is its own feature.
- E2E tests for the auth cycle (inherited since 2026-10-13).
- Prune of the `DEV` dependency set in the runtime image.

## Log

- **L1** (2026-10-20) — "vamos con el plan de deploy creo que eestaba en otra rama y habiamos quedado en que todo se despliega en railway donde nest publica el build del frontend"
- **L2** (2026-10-20) — Corrections before planning: `NIXPACKS` is no longer a valid Railway builder and `railway.json`/`railway.toml` is deprecated until 2026-12-01. User re-selected the build strategy as `railpack.json` after being shown the correction.
- **L3** (2026-10-20) — Verified while resuming: the SPA plan lives at `pedidos-web/odd/tasks/spa-static-serving.md` (wrong directory), the branch `feat/spa-static-serving` is already merged into `main` as `e18ed0f`, and `odd/tasks/pedidos-panaderia-mvp.md` still lists ODD-3.13 (Netlify) as pending. No deploy branch exists.