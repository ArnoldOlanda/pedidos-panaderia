# pedidos-web

Vite + React + TypeScript + Tailwind scaffold for the pedidos-panadería PWA.

## Stack

- Vite 5 (dev server + bundler)
- React 18
- TypeScript 5 (strict)
- Tailwind CSS 3.4 (JIT, `slate`/`amber` palette only)

## Prerequisites

- Node 20+
- npm 10+

## Install

```bash
npm install
```

## Dev server

```bash
npm run dev
```

Opens `http://localhost:5173`. `/api/*` requests are proxied to the backend
(default `http://localhost:3000`). To point at a different backend, set:

```bash
VITE_API_PROXY_TARGET=http://localhost:4000 npm run dev
```

## Build

```bash
npm run build
```

Type-checks first (`tsc -b`), then bundles to `dist/`.

## Preview production build

```bash
npm run preview
```

Opens `http://localhost:4173`.

## Type-check only

```bash
npm run typecheck
```

## Layout

```
index.html         # Vite entry, mounts <div id="root">
src/main.tsx       # createRoot mount + StrictMode
src/App.tsx        # scaffold landing card
src/index.css      # Tailwind directives + body font reset
src/vite-env.d.ts  # Vite client types
vite.config.ts     # dev server proxy to backend
tailwind.config.js # content paths + theme extend
postcss.config.js  # tailwindcss + autoprefixer
```

## Client infrastructure (task 3.4)

- `axios` instance at `src/lib/api.ts` — base `/api`, `withCredentials: true` (JWT cookie auth).
- `@tanstack/react-query` client at `src/lib/query-client.ts` — no retry on 4xx, `staleTime` 30s, no refetch on focus.
- `react-router-dom` v6 — `createBrowserRouter` in `src/router.tsx`, routes for `/login`, `/orders`, `/vendor/*`, plus 404.
- `zustand` auth store at `src/store/auth.ts` — holds user + status (`idle | loading | authenticated | unauthenticated`); no login/logout methods (those land in 3.5).
- `Layout` + `ProtectedRoute` shells — header nav, redirect to `/login` when unauthenticated.

Vite dev proxy already rewrites `/api/*` → `http://localhost:3000` (override via `VITE_API_PROXY_TARGET`).
Cookies are sent automatically; the frontend never sees the JWT. Auth state derives from `GET /api/auth/me` (wired in 3.5).

## What this scaffold does NOT include (arrives in later tasks)

- Login page — task 3.5
- PWA manifest, service worker — task 3.10
- i18n — UI strings are Spanish-only (Lima pilot users)

See `/root/../odd/tasks/pedidos-panaderia-mvp.md` for the full task tracker.