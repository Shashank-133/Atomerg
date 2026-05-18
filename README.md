<div align="center">

# AtomQuest 1.0
### In-House Goal Setting & Tracking Portal

**A structured, audit-ready platform for the full employee goal lifecycle — creation, alignment, approval, quarterly check-ins, and analytics.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-atomerg.onrender.com-3563de?style=for-the-badge&logo=render&logoColor=white)](https://atomerg.onrender.com)
[![Repo](https://img.shields.io/badge/GitHub-Shashank--133%2FAtomerg-181717?style=for-the-badge&logo=github)](https://github.com/Shashank-133/Atomerg)

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![Node](https://img.shields.io/badge/Node-22%2B-339933?logo=nodedotjs&logoColor=white)
![SQLite](https://img.shields.io/badge/node%3Asqlite-built--in-003B57?logo=sqlite&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-httpOnly%20cookie-EB5424?logo=jsonwebtokens&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-2-FF7300)

</div>

---

## One-click judge access

> **Live URL:** **<https://atomerg.onrender.com>**
> First click may take ~30s — free tier service spins up from sleep.

| Role | Email | Password | What you'll see |
|---|---|---|---|
| **Employee** | `employee@demo.com` | `password123` | Goal sheet (4 goals in mixed states), achievements, progress |
| **Manager** | `manager@demo.com` | `password123` | 3-person team, approvals, check-ins, analytics |
| **Admin** | `admin@demo.com` | `password123` | Org overview, shared goals, unlock, audit, CSV, escalations |

The login page also has **"click to use"** buttons that auto-fill any account in one tap — built specifically to make judge evaluation friction-free.

---

## What this solves

Manual goal tracking via spreadsheets and email creates three failures:
- **No real-time visibility** — managers can't see team progress between cycles.
- **No alignment** — employees can't trace their work to org priorities.
- **No audit trail** — HR can't answer "what changed and when" at appraisal time.

AtomQuest digitises the full lifecycle and enforces governance: every post-lock change is captured in an immutable audit log, every cycle window is admin-gated, and every shared KPI fans out to selected employees with synced achievements.

---

## Feature matrix — mapped to the BRD

### Phase 1 — Goal Creation & Approval (Must-Have)
| BRD Requirement | Implementation |
|---|---|
| Employee creates Goal Sheet with Thrust Area, Title, Description | `pages/employee/Goals.jsx` + modal form |
| UoM types: Numeric, %, Timeline, Zero-based | 4 UoM types with type-aware target inputs |
| Set Targets and Weightage per goal | Server-validated, live weightage meter on client |
| Total weightage = 100% | Submit button disabled until exact, animated meter |
| Min 10% per goal, Max 8 goals | Enforced server-side in `routes/goals.js` |
| Manager (L1) inline edit + approve / return-rework | Approve locks the goal, return requires note |
| Approved → locked | `isLocked=1`; further edits append to `AuditLogs` |
| **Shared Goals** push to multiple employees | Admin form with multi-select; recipients edit only weightage; achievement updates from primary owner mirror to all linked rows |

### Phase 2 — Achievement Tracking & Quarterly Check-ins (Must-Have)
| BRD Requirement | Implementation |
|---|---|
| Quarterly actual vs planned entry | `pages/employee/Achievements.jsx` — quarter selector, instant score preview |
| Status: Not Started / On Track / Completed | Per-goal per-quarter |
| Manager check-in module — planned vs actual + comment | `pages/manager/CheckInDetail.jsx` |
| Score formulas (exact spec) | See [Score logic](#score-logic) below |
| Quarterly cycle windows (May / Jul / Oct / Jan / Mar) | Admin-toggle override in `pages/admin/Cycle.jsx` |

### Reporting & Governance
| Requirement | Where |
|---|---|
| CSV / Excel achievement export | `/admin/report/csv` — per-employee × per-goal × Q1–Q4 actuals + scores |
| Completion dashboard | `pages/admin/Completion.jsx` — employee × quarter heat-map |
| Audit trail of all post-lock changes | `AuditLogs` table + paginated viewer |

### Bonus features (Section 5) implemented
- **Analytics module** — 5 KPI cards + manager check-in bar chart + thrust-area donut + Q1→Q4 trend line (Recharts).
- **Escalation module (rule-based)** — configurable rules, auto-runs every 5 min, manual run button, escalation log with resolve action, in-app + email + Teams card notifications.
- **Email & Teams notifications (in-app inbox)** — every domain event creates email + Teams cards in a per-user inbox with badge counter on the top bar.

---

## Architecture

```
                    ┌────────────────────────────────────┐
                    │  Single Render service (HTTPS)     │
                    │  https://atomerg.onrender.com      │
                    └──────────────────┬─────────────────┘
                                       │
       ┌───────────────────────────────┴──────────────────────────────┐
       │                                                              │
       ▼                                                              ▼
┌────────────────────┐    fetch /api/*  (cookie auth)        ┌──────────────────────┐
│   React 18 SPA     │  ────────────────────────────────►    │   Express API        │
│   Vite + Tailwind  │  ◄────────────────────────────────    │   JSON envelope      │
│   Recharts/Lucide  │       {success, data, error}          │   role middleware    │
│   served as static │                                       │                       │
└────────────────────┘                                       └──────────┬───────────┘
                                                                        │
                                                              ┌─────────▼──────────┐
                                                              │   node:sqlite      │
                                                              │  9 tables:         │
                                                              │  Users  Goals      │
                                                              │  Achievements      │
                                                              │  CheckIns  Audit   │
                                                              │  Cycle  Notify     │
                                                              │  Escalation*       │
                                                              └────────────────────┘

Background:  Escalation engine — setInterval(5 min) → writes to EscalationLog + Notifications
Auth:        bcryptjs hash + JWT (httpOnly, sameSite=lax, 8h expiry) in `aq_token` cookie
```

**Why these choices** (evaluation criterion #6 — Cost Optimisation):

| Choice | Reason |
|---|---|
| **Single service deploys both** | Server's `index.js` static-serves `client/dist`. One HTTPS origin = no CORS, simpler ops, lower cost. |
| **node:sqlite (built-in)** | Zero native dependencies, zero compile step, zero DB infra cost. Ships with Node 22.5+. |
| **httpOnly cookie JWT** | Stateless server — no Redis/session store needed. Survives restarts. |
| **Free Render web service** | Free tier runs the entire app. Free SQLite means no managed-DB billing. |

---

## Score logic

Implemented **exactly** as specified in the BRD — see `server/lib/score.js`:

```js
function computeScore(uomType, target, actual) {
  if (uomType === 'numeric_min') return Math.min((actual / target) * 100, 100);
  if (uomType === 'numeric_max') return actual <= target ? 100 : Math.min((target / actual) * 100, 100);
  if (uomType === 'timeline')    return actual <= target ? 100 : 0;
  if (uomType === 'zero')        return actual === 0 ? 100 : 0;
}
```

| UoM Type | Example goal | Formula |
|---|---|---|
| `numeric_min` | Sales revenue, NPS lift | `min(actual ÷ target × 100, 100)` |
| `numeric_max` | TAT, Cost, Churn | `target ÷ actual × 100` (capped at 100) |
| `timeline` | "Ship feature by Sept 30" | `actual ≤ target` → 100 else 0 |
| `zero` | Safety incidents | `actual = 0` → 100 else 0 |

---

## Run locally

```bash
git clone https://github.com/Shashank-133/Atomerg.git
cd Atomerg
npm run install:all
npm run dev
```

Then open <http://localhost:5173>. The SQLite database (`server/data/portal.db`) is created and seeded on first run — no manual setup.

**Stack requirement:** Node.js **22.5+** (for the built-in `node:sqlite` module). Tested on Node 24.13.1.

---

## Project structure

```
atomberg/
├── package.json              # root — concurrently runs both halves
├── client/                   # React SPA (Vite)
│   ├── vite.config.js        # /api proxy to :4000 in dev
│   ├── tailwind.config.js
│   └── src/
│       ├── lib/              # api client, auth context, utils
│       ├── components/
│       │   ├── ui/           # shadcn-style primitives
│       │   ├── layout/       # Sidebar, TopBar, AppShell
│       │   └── common/       # StatusBadge, WeightageMeter, EmptyState…
│       └── pages/
│           ├── Login.jsx
│           ├── employee/     # Goals · Achievements · Progress
│           ├── manager/      # Team · EmployeeReview · CheckIns · CheckInDetail
│           ├── admin/        # Overview · Completion · SharedGoals · Unlock · Audit · Report · Cycle · Escalations
│           └── analytics/    # Dashboard
└── server/                   # Express API
    ├── index.js              # bootstrap + static serve dist
    ├── db.js                 # schema + seed (3 demo users + 4 sample goals)
    ├── lib/
    │   ├── sqlite.js         # thin wrapper around node:sqlite
    │   ├── score.js          # computeScore (BRD-exact)
    │   ├── audit.js          # AuditLog writer
    │   ├── envelope.js       # {success, data, error}
    │   └── notify.js         # email+Teams card writer
    ├── middleware/           # auth (JWT) · role guards
    └── routes/
        ├── auth.js  goals.js  achievements.js
        ├── manager.js  admin.js
        ├── analytics.js  escalations.js
        ├── notifications.js  cycle.js
```

---

## API surface

All responses follow `{ success, data, error }`. Auth via httpOnly cookie set on login.

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | public | Email + password → cookie |
| POST | `/api/auth/logout` | any | Clear cookie |
| GET  | `/api/auth/me` | any | Current user |
| GET  | `/api/goals` | employee | My goals + weight total |
| POST | `/api/goals` | employee | Create (max 8, min 10%, ≤100% total) |
| PUT  | `/api/goals/:id` | employee | Edit (pre-lock; shared = weightage only) |
| DELETE | `/api/goals/:id` | employee | Delete (pre-submit only) |
| POST | `/api/goals/:id/submit` | employee | Submit single |
| POST | `/api/goals/batch-submit` | employee | Submit all (requires sum = 100) |
| POST | `/api/achievements` | employee | Log Q1–Q4 actual; mirrors to shared goals |
| GET  | `/api/manager/team` | manager | Direct reports + stats |
| GET  | `/api/manager/team/:id/goals` | manager | Drill-down sheet |
| PUT  | `/api/manager/goals/:id` | manager | Inline target/weight edit |
| POST | `/api/manager/goals/:id/approve` | manager | Approve + lock |
| POST | `/api/manager/goals/:id/return` | manager | Return for rework (note required) |
| GET / POST | `/api/manager/checkins` | manager | List · save check-in |
| GET  | `/api/admin/overview` | admin | Full org table |
| GET  | `/api/admin/completion` | admin | Heat-map data |
| POST | `/api/admin/shared-goal` | admin | Fan-out KPI to many employees |
| POST | `/api/admin/unlock/:goalId` | admin | Unlock + audit |
| GET  | `/api/admin/audit-logs` | admin | Paginated audit |
| GET  | `/api/admin/report/csv` | admin | CSV download |
| GET / PUT | `/api/admin/cycle/:key` | admin | Open / close quarter |
| GET  | `/api/analytics/*` | manager+admin | KPIs · manager completion · thrust dist · QoQ trend |
| GET / POST / PUT / DELETE | `/api/escalations/*` | admin | Rule CRUD · run engine · resolve |
| GET / POST | `/api/notifications` | any | Inbox · mark read |

---

## Quality bars hit

- Zero unhandled promise rejections / console errors during smoke tests
- All API routes return `{ success, data, error }` consistently
- Every DB call wrapped in try/catch with friendly error messages
- Server-side input validation on every mutating endpoint (client validation is UX only)
- JWT expiry handled — 401 auto-redirects to login
- Hover states + zebra striping + empty states on every table
- Loading spinners on every async screen
- Toast notifications (never `alert()`) on every mutation
- Mobile-responsive sidebar collapse + adaptive grid layouts

---

## Submission deliverables

| # | Deliverable | Where |
|---|---|---|
| 1 | Live hosted demo URL | **<https://atomerg.onrender.com>** |
| 2 | Source code repository | **<https://github.com/Shashank-133/Atomerg>** |
| 3 | Architecture diagram | See [Architecture](#architecture) section above |
| 4 | Login credentials | See [One-click judge access](#one-click-judge-access) above |

---

## NPM scripts

| Command | Effect |
|---|---|
| `npm run install:all` | Install root + server + client deps |
| `npm run dev` | Run API (`:4000`) + Vite (`:5173`) with hot reload |
| `npm run build` | Production build of the React client |
| `npm start` | Start the API in production (serves built client too) |

---

<div align="center">

**Built for AtomQuest Hackathon 1.0** · Single-service deploy · Zero external infrastructure

</div>
