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

## Tooling

- Node 20+
- npm 10+
- Git (Conventional Commits)

## Pilot users (dev only)

Used by the seed script. Login with `11111111` to enter as a VENDEDOR (vendor), `22222222` to enter as a COMPRADOR (buyer).

| DNI         | Name             | Role     |
|-------------|------------------|----------|
| 11111111    | Ana Pastelera    | VENDEDOR |
| 22222222    | Bruno Comprador  | COMPRADOR|
| 33333333    | Carla Vendedora  | VENDEDOR |
| 44444444    | Diego Comprador  | COMPRADOR|