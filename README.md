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

Scaffolded in milestone 3. Until then the folder contains a placeholder.

## Tooling

- Node 20+
- npm 10+
- Git (Conventional Commits)