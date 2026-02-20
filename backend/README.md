# MHP Backend

Express API server for Meal Headcount Planner.

## Setup

```bash
npm install
cp .env.example .env    # set SESSION_SECRET
npm run seed            # seed teams, settings, and dev users (password: pass123)
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

* `POST /api/auth/login` — Authenticate user
* `POST /api/auth/logout` — End session
* `GET /api/auth/me` — Get current user
* `GET /api/meals` — Get user's meal status for a date
* `POST /api/meals/:mealType/opt-out` — Opt out of a meal
* `POST /api/meals/:mealType/opt-in` — Opt in to a meal
* `GET /api/headcount` — Get aggregated headcount report
* `GET /api/team/members` — Get team members (with optional meal status)
* `GET /api/special-days` — List special days
* `POST /api/special-days` — Create special day
* `GET /api/settings` — Get app settings
* `PUT /api/settings` — Update settings (ADMIN only)
* `GET /api/events/stream` — SSE live updates

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
