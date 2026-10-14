# Feature: spa-static-serving

Goal: make NestJS serve the built SPA from `pedidos-api`, so a single Node
process can host both the API and the catalog/orders UI on the same origin.
Required for the Railway monolith deploy.

## Decisions (locked in)

- `ServeStaticModule` from `@nestjs/serve-static` v4 (Nest 10 compatible),
  root `pedidos-api/public/`, exclude `/api/(.*)`.
- SPA fallback uses an Express catch-all in `main.ts` (not a Nest
  controller) so we don't fight with the global `api` prefix.
- Static root path is `process.cwd() + '/public'` so dev (`start:dev`)
  and prod (`start:prod`) resolve identically when the user is in
  `pedidos-api/`.
- Build chain uses npm's `prebuild` to build the web and copy
  `pedidos-web/dist/` into `pedidos-api/public/`. `nest build` still
  produces `pedidos-api/dist/`.
- `pedidos-api/public/` is gitignored (build artifact).

## Work units (one conventional commit each)

### WU-1 — `chore(api): add @nestjs/serve-static and ignore built public/`
- Files:
  - `pedidos-api/package.json` (add `@nestjs/serve-static` ^4.0.0 to deps)
  - `.gitignore` (add `pedidos-api/public/`)
- `npm install` to resolve.

### WU-2 — `feat(api): serve built SPA from api with ServeStaticModule + SPA fallback + chained build`
- Files:
  - `pedidos-api/src/app.module.ts` (wire `ServeStaticModule.forRoot(...)`)
  - `pedidos-api/src/main.ts` (Express catch-all after Nest init, before
    `app.listen`, server-side check on `public/index.html` so dev with no
    SPA build keeps returning 404 instead of crashing)
  - `pedidos-api/package.json` (add `prebuild` and `build:web` scripts)
- Verify: `cd pedidos-web && npm run build && cd ../pedidos-api && npm run build`,
  then `node dist/main.js` boots (env stub) and serves `/`.

### WU-3 — `docs(plan): record commit hashes for spa-static-serving`
- File: this task file.
- Update the commit log section with the hashes produced by WU-1 and WU-2.

## Acceptance

1. `cd pedidos-api && npm run build` builds the SPA, copies it to
   `public/`, then builds the Nest bundle.
2. With production env vars set, `node dist/main.js` listens on PORT
   and serves both `/api/health` (JSON) and `/` (the SPA HTML).
3. `npm test` (api unit + e2e) still green; ServeStatic logs a warning
   when `public/` is absent, but does not fail module init.
4. `public/` is not committed.

## Commit log

- WU-1: <hash>
- WU-2: <hash>
- WU-3: <hash>
