# AtomQuest 1.0 — Goal Setting & Tracking Portal

In-house, audit-ready goal lifecycle platform built for the AtomQuest Hackathon 1.0.

## Quick start

```bash
npm run install:all
npm run dev
```

- Client: http://localhost:5173
- API:    http://localhost:4000

The SQLite database (`server/data/portal.db`) is created and seeded automatically on first run.

## Demo logins

| Role     | Email               | Password    |
|----------|---------------------|-------------|
| Employee | employee@demo.com   | password123 |
| Manager  | manager@demo.com    | password123 |
| Admin    | admin@demo.com      | password123 |

Arjun (employee) reports to Priya (manager). Rohit is admin.

## Architecture

```
client/  React 18 + Vite + Tailwind + Recharts + Lucide
server/  Express + better-sqlite3 + JWT (httpOnly cookie) + bcryptjs
```

- Single SPA, JSON API, SQLite file DB — zero external services.
- Server validates everything; client validation is for UX only.
- All mutations on locked goals append to the `AuditLogs` table.

## Feature matrix

**Phase 1** — goal creation, validation (max 8, min 10%, sum=100), L1 approval, shared goals.

**Phase 2** — quarterly achievement entry, manager check-ins, computed progress scores.

**Bonus** — Analytics dashboard (4 KPI cards + 3 Recharts), rule-based Escalations engine,
mocked Email/Teams notification inbox, admin cycle-window toggle.

## Scripts

- `npm run dev` — runs API and Vite together with hot reload
- `npm run build` — production build of the client
- `npm start` — start the API only (serves the built client too)
