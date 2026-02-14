# MHP Backend - Iteration 1

Meal Headcount Planner backend service.

## Quick Start (5 minutes)

```bash
cd backend
npm install
cp .env.example .env
npm run create-user "Admin" admin admin123 ADMIN
npm start
```

Open http://localhost:3000 and login with `admin` / `admin123`

## Running Tests

```bash
npm test
```

**Test Coverage:** 14 tests passing
- Unit tests: Headcount calculation, opt-in/out logic
- Integration tests: Auth, authorization, role-based overrides

## Prerequisites

- Node.js 18+
- npm

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

3. **Create admin user:**
   ```bash
   npm run create-user "Admin" admin yourpassword ADMIN
   ```

4. **Start server:**
   ```bash
   npm start          # Production
   npm run dev        # Development (auto-reload)
   ```

5. **Access:** http://localhost:3000

## Creating Users

```bash
npm run create-user <name> <username> <password> <role> [teamId]
```

**Roles:** EMPLOYEE, TEAM_LEAD, ADMIN, LOGISTICS

**Examples:**
```bash
npm run create-user "Alice" alice pass123 EMPLOYEE team-a
npm run create-user "Bob Lead" bob pass123 TEAM_LEAD team-a
npm run create-user "Logistics" logistics pass123 LOGISTICS
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `SESSION_SECRET` | Session encryption key | (required) |
| `NODE_ENV` | Environment | development |

## How It Works

- **Default opt-in:** All users are IN for all meals by default
- **Explicit opt-out:** Users must opt out if not eating
- **Absence = IN:** No record means opted in
- **Audit trail:** All changes tracked with updatedBy/updatedAt

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| **EMPLOYEE** | View and update own meal status |
| **TEAM_LEAD** | Override meals for own team members |
| **ADMIN** | Override meals for any user |
| **LOGISTICS** | View aggregated headcount only |

## Project Structure

```
backend/
├── data/              # JSON storage
├── scripts/           # CLI utilities
├── src/
│   ├── constants/     # Roles, meal types
│   ├── middleware/    # Auth, error handling
│   ├── routes/        # API endpoints
│   ├── services/      # Business logic
│   ├── storage/       # JSON operations
│   ├── views/         # EJS templates
│   └── app.js         # Express setup
├── tests/             # Test suite
└── package.json
```

## Troubleshooting

**Port in use:** Change `PORT` in `.env`

**Session warning:** Set `SESSION_SECRET` in `.env`

**No users:** Create at least one user with the script
