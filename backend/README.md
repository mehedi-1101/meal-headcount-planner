# MHP Backend

Express API server for Meal Headcount Planner.

## Setup

```bash
npm install
cp .env.example .env    # set SESSION_SECRET
npm run seed            # seed teams, settings, and dev users (password: password)
npm run dev             # starts on http://localhost:3000
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with auto-reload (nodemon) |
| `npm start` | Start in production mode |
| `npm run seed` | Seed teams, settings, and dev users |
| `npm run seed -- --force` | Overwrite existing data with seed |
| `npm run create-user` | Add a single user (see below) |
| `npm test` | Run test suite |

## Adding users

```bash
npm run create-user -- "Full Name" username password ROLE [teamId]
```

**Roles:** `EMPLOYEE`, `TEAM_LEAD`, `ADMIN`, `LOGISTICS`

**Team IDs:** `mimir`, `saga`, `vimond`, `admin-account`, `marketing`, `logistics`

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3000` |
| `SESSION_SECRET` | Session encryption key | required |
| `NODE_ENV` | Environment | `development` |

## Project structure

```
backend/
├── data/           # JSON storage (users/meals gitignored; teams/settings tracked)
├── scripts/        # seed.js, createUser.js
├── src/
│   ├── constants/  # Roles, meal types, locations
│   ├── middleware/ # Auth, cutoff enforcement, error handler
│   ├── routes/     # API endpoints (/api/*)
│   ├── services/   # Business logic
│   ├── storage/    # jsonStore (read/write helpers)
│   └── app.js
└── tests/
```

## API Endpoints

**Auth**
* `POST /api/auth/login` — Authenticate user
* `POST /api/auth/logout` — End session
* `GET /api/auth/me` — Get current user

**Meals**
* `GET /api/meals` — Get user's meal status for a date
* `POST /api/meals/:mealType/opt-out` — Opt out of a meal
* `POST /api/meals/:mealType/opt-in` — Opt in to a meal
* `POST /api/meals/override` — Override a single user's meal (TL/Admin)
* `POST /api/meals/bulk-override` — Bulk override meals for multiple users (TL/Admin)

**Headcount**
* `GET /api/headcount` — Aggregated headcount report for a date (Admin/Logistics)
* `GET /api/headcount/forecast` — Per-date headcounts for a date range (Admin/Logistics)

**Work Location**
* `GET /api/work-location` — Get effective location for a user on a date
* `POST /api/work-location` — Set own location for a date
* `POST /api/work-location/override` — Override a user's location (TL/Admin)
* `GET /api/work-location/monthly-usage` — WFH day counts per user for a month (scoped by role)

**Team**
* `GET /api/team/participation` — Team participation for a date (scoped by role)

**Special Days**
* `GET /api/special-days` — List special days for a month
* `POST /api/special-days` — Create special day (Admin/Logistics)
* `PUT /api/special-days/:date` — Update special day (Admin/Logistics)
* `DELETE /api/special-days/:date` — Delete special day (Admin/Logistics)

**Settings**
* `GET /api/settings` — Get app settings
* `PUT /api/settings` — Update settings (Admin only)

**Audit**
* `GET /api/audit` — Change history for a user on a date (TL → own team, Admin/Logistics → all)

**Reports**
* `GET /api/reports/wfh-overage` — Over-limit employees with rollup for a month (TL/Admin/Logistics)

**Dashboard**
* `GET /api/dashboard/operational` — Today + tomorrow snapshot + upcoming special days (Admin/Logistics)

**Announcement**
* `GET /api/announcement` — Generate copy-paste announcement for a date (Admin/Logistics)

**Live Updates**
* `GET /api/events/stream` — SSE stream for headcount and special-day changes

## Troubleshooting

**Session secret warning:**
```bash
# Set SESSION_SECRET in .env to a random string
SESSION_SECRET=your-secret-key-here
```

**No users after fresh clone:**
```bash
# Run seed script to create default users
npm run seed
```
