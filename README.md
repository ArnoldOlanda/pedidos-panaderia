# pedidos-panaderia

PWA for a bakery/pastry course: daily catalog, time-windowed orders, and push notifications.

## Repository layout

```
pedidos-api/   # NestJS 10 backend (TypeScript strict)
pedidos-web/    # Vite + React frontend (PWA)
odd/tasks/     # Organic Driven Development task tracker
```

## Quick start

### Backend (`pedidos-api`)

```bash
cd pedidos-api
cp .env.example .env       # fill in values
npm install
npm run start:dev          # http://localhost:3000  (health: /api/health)
```

### Frontend (`pedidos-web`)

Vite + React + TypeScript + Tailwind scaffold. See [`pedidos-web/README.md`](./pedidos-web/README.md) for install / dev / build / proxy instructions (`VITE_API_PROXY_TARGET`).

## Deploy

Production is **one Railway service**. `pedidos-api` answers `/api/*` and also
serves the built SPA from `pedidos-web`, so there is no second frontend host.
The build is declared in [`railpack.json`](./railpack.json) at the repo root.

The repository is hosted at `github.com/ArnoldOlanda/pedidos-panaderia`, and
Railway builds from it on every push to `main`.

### 1. Create the project

1. **New Project → Deploy from GitHub repo**, pick this repository.
2. **Add the `Postgres` plugin** to the same project.
3. Leave **Root Directory** at `/`. Setting it would make Railway build from a
   subdirectory and miss the second `package.json`.

### 2. Environment variables

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Railway reference variable, resolved from the Postgres plugin in the same project. It points at the private network, so no TLS is involved. |
| `JWT_SECRET` | `openssl rand -hex 32` | minimum 16 characters |
| `VAPID_SUBJECT` | `mailto:you@example.com` | |
| `VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` | never commit the private key |
| `VAPID_PRIVATE_KEY` | same command | |
| `WEB_ORIGIN` | `https://pedidos-panaderia-production.up.railway.app` | same origin as the API now, so CORS does not apply to it |
| `NODE_ENV` | `production` | |
| `TZ` | `America/Lima` | **required**, see below |
| `PORT` | injected by Railway | do not set |

`TZ` is not optional. `products.closesAt` is a `timestamp without time zone`:
Node parses it using the process timezone and compares it against the current
time. Railway runs UTC by default, which shifts every closing time by five
hours and lets products close early or late. The durable fix is migrating the
column to `timestamptz`, which is a separate change.

### 4. Pre-deploy Command

Settings → Deploy → **Pre-deploy Command**:

```bash
cd pedidos-api && node dist/database/migrate.js && node dist/database/seeds/seed.js
```

It runs before the new version starts receiving traffic. Two details matter:
the `cd`, because commands run from the app root and the compiled files live in
`pedidos-api/dist`; and the compiled runner, because the runtime image carries
production dependencies only — there is no `ts-node` and no `src/` tree there.
The seed is idempotent and safe to re-run.

### 5. Health check

Settings → Deploy → **Healthcheck Path**: `/api/health`.

This lives in the service settings rather than in `railpack.json` because the
Railpack schema has no key for it — `deploy` accepts only `startCommand`,
`variables`, `paths`, `inputs`, `base` and `aptPackages`.

### 6. Verify the first deploy

```bash
curl https://<your-domain>/api/health        # JSON, no auth
```

Then in a browser: `/` renders the catalog, a deep link such as `/catalog`
returns the SPA instead of a 404, and you can log in with a seeded DNI.

### Why `railpack.json` and not `railway.json`

Railway's Config as Code (`railway.json` / `railway.toml`) is deprecated: it is
only honoured for legacy services until 2026-12-01, and `NIXPACKS` is no longer
a valid `build.builder` at all. `railpack.json` is the builder's own
configuration format and carries no such deadline.

### Two build constraints that are easy to break

Both cost a failed deploy before they were understood.

**The repository root needs a `package.json`.** Railpack's node provider
initialises from a manifest at the build root, and this repo has two projects
in subdirectories with no workspaces. Without a root manifest the provider
never comes up:

```
Failed to initialize provider `node`: error reading root package.json:
open .../snapshot-target-unpack/package.json: no such file or directory
```

The root `package.json` and `package-lock.json` exist for that reason alone.
The root manifest holds no dependencies; the two projects keep their own.

**`steps` in `railpack.json` is a dependency graph, not a list of phases.** A
step without an `inputs` edge has no ordering guarantee, so `install` and
`build` ran a millisecond apart and the build hit files that did not exist yet.
The edges are explicit: `install` → `build` → `deploy`.

### Troubleshooting

| Symptom | Cause |
|---|---|
| Build fails with "Failed to initialize provider `node`" | the root `package.json` is missing or was deleted |
| Build fails with ENOENT on a subproject manifest | the `build` step lost its `inputs` edge to `install` |
| Blank page, API works | `pedidos-api/public/` never made it into the image; check the build log for the `prebuild` copy step |
| "Cannot find module .../migrate.js" | the Pre-deploy Command is missing the `cd pedidos-api` |
| Products close at the wrong hour | `TZ` is unset |
| App boots but every request 500s | `WEB_ORIGIN` does not match the deployed origin |

## Tooling

- Node 20+
- npm 10+
- Git (Conventional Commits)

## Pilot users (dev only)

Created by `npm run db:seed`. Buyers are anonymous — they place an order
without an account, and their details are snapshotted onto the order — so the
only seeded users are vendors.

| DNI         | Name             | Role     |
|-------------|------------------|----------|
| 11111111    | Ana Pastelera    | VENDEDOR |
| 33333333    | Carla Vendedora  | VENDEDOR |

Log in at `/login` with the DNI alone. A DNI that is not registered returns
401 rather than creating an account; register a new vendor at `/register`.