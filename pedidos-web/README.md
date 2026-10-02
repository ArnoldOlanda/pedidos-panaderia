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

## What this scaffold does NOT include (arrives in later tasks)

- Router, query client, state store, axios client — task 3.4
- Login page — task 3.5
- PWA manifest, service worker — task 3.10
- i18n — UI strings are Spanish-only (Lima pilot users)

See `/root/../odd/tasks/pedidos-panaderia-mvp.md` for the full task tracker.