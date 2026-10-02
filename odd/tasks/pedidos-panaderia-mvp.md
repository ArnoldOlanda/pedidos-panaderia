# Feature: pedidos-panaderia-mvp

PWA para curso de panadería/pastelería: catálogo diario, pedidos con ventana horaria, push notifications, deploy Railway + Netlify.

## Status

- Started: 2026-10-02
- Current task: 3.11
- Branch: feat/odd-3-10-pwa-manifest

## Tasks

### Milestone 1 — Backend foundations + auth (Week 1)

- [x] **1.1** — Bootstrap repo + NestJS scaffold + health endpoint
- [x] **1.2** — TypeORM + User entity + first migration
- [x] **1.3** — Auth module (DNI login + JWT cookie + me + role guards)
- [x] **1.4** — Seed script with vendor + buyer whitelist

### Milestone 2 — Recipes + products + orders (Week 2)

- [x] **2.1** — Recipe entity + cost formula + CRUD
- [x] **2.2** — Product entity + public catalog endpoints
- [x] **2.3** — Vendor publishes product (POST /api/products)
- [x] **2.4** — Order entity + buyer places order + window validation
- [x] **2.5** — Order listing + status state machine (vendor)
- [x] **2.6** — Auto-close scheduler (`*/5 * * * *`)

### Milestone 3 — Push + PWA + deploy (Week 3)

- [x] **3.1** — Web-push module (VAPID + subscribe/unsubscribe)
- [x] **3.2** — Push hooks (vendor at close + buyer on LISTO)
- [x] **3.3** — Frontend scaffold (Vite + React + TS + Tailwind)
- [x] **3.4** — Router + Query + Zustand + Axios client
- [x] **3.5** — Login page (DNI + name) + auth bootstrap (native review caught 5 critical findings, escalation resolved with second fix + clone-local RDD off; 401 vs infrastructure error split + Reintentar reachable)
- [x] **3.6** — Public catalog + product detail
- [x] **3.7** — Buyer places order + my orders list
- [x] **3.8** — Vendor publishes product page
- [x] **3.9** — Vendor order list + status update UI
- [x] **3.10** — PWA manifest + service worker
- [ ] **3.11** — Push subscription manager (frontend)
- [ ] **3.12** — Deploy backend to Railway
- [ ] **3.13** — Deploy frontend to Netlify

## Open Decisions (defaults applied unless user overrides)

| # | Decision | Default |
|---|----------|---------|
| D1 | Repo structure | One git repo, two folders |
| D2 | Cron close frequency | Every 5 min (spec §10) |
| D3 | closesAt timezone | UTC stored, America/Lima in UI |
| D4 | JWT cookie SameSite prod | `none; secure` |
| D5 | Same buyer + same product | Allow multiple |
| D6 | PWA icons | Placeholder PNGs |
| D7 | iOS push | Document home-screen install |

## Progress Log

<!-- entries appended here after each task lands -->
<!-- 2026-10-02: 1.1 done — 7bd197e — bootstrap NestJS + health endpoint -->
<!-- 2026-10-02: 1.2 done — deaca5f — TypeORM + User entity + first migration -->
<!-- 2026-10-02: 1.3 done — e9a920e — auth module: DNI login + JWT cookie + role guards -->
<!-- 2026-10-02: 1.4 done — e2db9a4 — seed script idempotent + pilot DNIs in README -->
<!-- 2026-10-02: 2.1 done — c79f84b — recipe entity + cost formula + CRUD -->
<!-- 2026-10-02: 2.2 done — 5fd4d8d — product entity + public catalog + mine/today -->
<!-- 2026-10-02: 2.3 done — aff70ab — vendor publish product POST -->
<!-- 2026-10-02: 2.4 done — 7997ec9 — order entity + buyer POST /api/orders -->
<!-- 2026-10-02: 2.5 done — eec1c84 — order listing + status state machine -->
<!-- 2026-10-02: 2.6 done — 3a2e8eb — auto-close cron */5 * * * * -->
<!-- 2026-10-02: 3.1 done — a90074c — web-push module: VAPID + subscribe/unsubscribe -->
<!-- 2026-10-02: 3.2 done — ae587e6 — push hooks: vendor auto-close + buyer LISTO -->
<!-- 2026-10-02: 3.3 done — 9ae8705 — frontend scaffold: Vite + React + TS + Tailwind -->
<!-- 2026-10-02: 3.4 done — 716613f — client infra: router + react-query + zustand + axios -->
<!-- 2026-10-02: 3.5 done — 681260f — login page: DNI + name form, auth bootstrap, 401-vs-infrastructure error split, Reintentar reachable; native review caught 5 critical issues, escalation resolved via second fix; RDD disabled on this clone -->
<!-- 2026-10-02: 3.6 done — d040381 — public catalog grid + product detail page (work-unit recorded 4efb3a2 pre-amend; HEAD is d040381) -->
<!-- 2026-10-02: 3.7 done — 7d8bcc6 — buyer order flow: place order + my orders list -->
<!-- 2026-10-02: 3.8 done — 8a2c47b — vendor publish form: recipe select, price, date+closesAt, mine/today list -->
<!-- 2026-10-02: 3.9 done — 422a530 — vendor orders: product select + LISTO/ENTREGADO transitions -->
<!-- 2026-10-02: 3.10 done — 04c124f3 — PWA manifest + service worker + placeholder icons -->
