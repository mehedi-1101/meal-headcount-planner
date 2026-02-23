### Meal Headcount Planner (MHP)

Internal web application for collecting and reporting daily meal headcounts. Default opt-in, role-based access, live updates via SSE.

---

#### Features

* Default opt-in meal participation with explicit opt-out
* Role-based access control (Employee, Team Lead, Admin, Logistics)
* Real-time headcount updates via Server-Sent Events (SSE)
* Team-based meal management and overrides
* Special days support (holidays, celebrations, office closures)
* Work location tracking (Office/WFH)
* Cutoff time enforcement for meal changes
* Iftar and company WFH period support
* Forward planning — employees can plan meals and location up to a configurable number of days ahead
* Monthly WFH allowance tracking with soft-limit warnings and overage report
* Audit trail — every meal and location change is recorded with actor and timestamp
* 14-day headcount forecast and operational dashboard for Admin/Logistics

---

#### Prerequisites

* Node.js 18+ and npm

---

#### Tech Stack

* **Backend:** Node.js, Express, file-based JSON storage
* **Frontend:** React + Vite (SPA)
* **Auth:** Session-based (httpOnly cookies)

---

#### Project Structure

```
mhp/
 ├─ backend/    # Express API server + JSON data
 ├─ frontend/   # React SPA (Vite)
 └─ docs/       # Technical design and task specs
```

---

#### Quick Start (dev)

**1. Backend**

```bash
cd backend
npm install
cp .env.example .env          # set SESSION_SECRET
npm run seed                  # create teams, settings, and seed users
npm run dev                   # starts on http://localhost:3000
```

**2. Frontend** (separate terminal)

```bash
cd frontend
npm install
npm run dev                   # starts on http://localhost:5173
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the backend.

**Seed credentials** — all seed users share password `password`:

| Username | Role |
|---|---|
| `admin` | ADMIN |
| `rachel.b` | LOGISTICS |
| `sarah.j` | TEAM_LEAD (Mimir) |
| `michael.c` | EMPLOYEE (Mimir) |

See `backend/scripts/seed.js` for the full list.

---

#### Adding users

```bash
cd backend
npm run create-user -- "Full Name" username password ROLE [teamId]
```

**Roles:** `EMPLOYEE`, `TEAM_LEAD`, `ADMIN`, `LOGISTICS`

---

#### Production build

```bash
cd frontend && npm run build   # outputs to frontend/dist
# copy dist/ to backend/public/
cd backend && npm start
```

Express serves the React build alongside the API.

---

#### Data files

`backend/data/` holds JSON storage. Files committed to git:

- `teams.json` — team definitions
- `settings.json` — cutoff time, off days, Iftar/WFH periods

Files **not** committed (gitignored — run `npm run seed` on fresh clone):

- `users.json` — accounts + password hashes
- `meals.json` — participation records
- `workLocations.json` — location overrides
- `specialDays.json` — holidays, closures, celebrations
- `auditLogs-YYYY-MM.json` — monthly-partitioned audit log (created automatically on first mutation)

---

Detailed design: [docs/technical-design.md](docs/technical-design.md)
