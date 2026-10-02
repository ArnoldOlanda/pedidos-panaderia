# Feature: pedidos-panaderia-mvp

PWA para curso de panadería/pastelería: catálogo diario, pedidos con ventana horaria, push notifications, deploy Railway + Netlify.

## Status

- Started: 2026-10-02
- Current task: 2.1
- Branch: main

## Tasks

### Milestone 1 — Backend foundations + auth (Week 1)

- [x] **1.1** — Bootstrap repo + NestJS scaffold + health endpoint
- [x] **1.2** — TypeORM + User entity + first migration
- [x] **1.3** — Auth module (DNI login + JWT cookie + me + role guards)
- [x] **1.4** — Seed script with vendor + buyer whitelist

### Milestone 2 — Recipes + products + orders (Week 2)

- [ ] **2.1** — Recipe entity + cost formula + CRUD
- [ ] **2.2** — Product entity + public catalog endpoints
- [ ] **2.3** — Vendor publishes product (POST /api/products)
- [ ] **2.4** — Order entity + buyer places order + window validation
- [ ] **2.5** — Order listing + status state machine (vendor)
- [ ] **2.6** — Auto-close scheduler (`*/5 * * * *`)

### Milestone 3 — Push + PWA + deploy (Week 3)

- [ ] **3.1** — Web-push module (VAPID + subscribe/unsubscribe)
- [ ] **3.2** — Push hooks (vendor at close + buyer on LISTO)
- [ ] **3.3** — Frontend scaffold (Vite + React + TS + Tailwind)
- [ ] **3.4** — Router + Query + Zustand + Axios client
- [ ] **3.5** — Login page (DNI + name) + protected routes
- [ ] **3.6** — Public catalog + product detail
- [ ] **3.7** — Buyer places order + my orders list
- [ ] **3.8** — Vendor publishes product page
- [ ] **3.9** — Vendor order list + status update UI
- [ ] **3.10** — PWA manifest + service worker
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
