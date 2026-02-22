# Meal Headcount Planner — Technical Design

- **Author:** Mehedi Hasan
- **Date:** 2026-02-23
- **Version:** 3.0
- **Status:** Ready

**Links**

* Iteration 1 PR: [docs: add authoritative technical design for MHP iteration 1](https://github.com/mehedi-1101/meal-headcount-planner/pulls)
* Iteration 1 Issue: [#2](https://github.com/mehedi-1101/meal-headcount-planner/issues/2)
* Iteration 2 PR: _TBD_

---

## 2. Summary

The Meal Headcount Planner is an internal system for collecting daily meal participation data with a default opt-in model. It supports role-based access, team-scoped overrides, and aggregated headcount visibility for logistics.

Iteration 1 established the core: correct headcounts, role-based permissions, audit trail, and JSON-based storage.

Iteration 2 extended this with team-scoped participation views, special day management, work location tracking, rules-based meal availability, cutoff enforcement, bulk override actions, live updates via SSE, and a React SPA.

Iteration 3 enables forward planning, forecasts, Operational Dashboards, WFH soft-limits tracking per calendar month, and detailed UI audit logs for managers.

---

## 3. Problem Statement

The original Excel-based meal tracking process was error-prone, lacked auditability, and required manual coordination between employees, team leads, and logistics. Incorrect headcounts directly impact procurement and operational planning.

Iteration 1 addressed the core gaps: centralized data, role-aware access, correct daily headcounts.

What remains: there's no way to handle holidays or office closures, no visibility into team-level participation, no distinction between office and WFH employees, and every interaction requires a full page reload. The tool needs to be faster, smarter about which meals apply on a given day, and capable of producing the daily announcement that gets shared with the team (e.g., via Discord).

Iteration 2 solved the core daily workflow. What it didn't address: employees cannot plan meals or work location for upcoming days; Logistics has no visibility into next-week headcounts; when a TL or Admin overrides a record there is no traceable history visible in the UI; WFH usage is tracked per-record but no one can easily see who has exceeded the monthly 5-day allowance; the Special Days form gives no hint that adding meals to a Celebration creates an "Event".

---

## 4. Goals and Non-Goals

### Goals

**Established (Iteration 1)**
* Provide a correct and auditable daily meal headcount
* Support default opt-in with explicit opt-out
* Enforce role-based and team-based permissions
* Allow manual overrides by authorized roles
* Expose aggregated headcount data for logistics

**Added (Iteration 2)**
* Team-scoped participation views with privacy boundaries
* Meal availability driven by rules: Lunch/Snacks on working days, Iftar by period, Event meals by admin action
* Work location tracking (Office/WFH) independent of meal participation
* Special day management: Office Closed, Government Holiday, Celebration
* Bulk override actions scoped by role
* Live headcount updates via Server-Sent Events
* Cutoff enforcement with configurable time (default: 10 PM day before)
* Copy-paste-friendly daily announcement generation (e.g., for Discord)
* React-based frontend replacing EJS templates

**Added (Iteration 3)**
* Future Planning: employees can plan participation within a configurable forward window
* Headcount forecasting and Operational Dashboard for Admin/Logistics
* Auditability: UI-accessible audit logs indicating "who changed what and when"
* Monthly WFH allowance tracking (soft limit of 5 days) with over-limit indicators, rollup reports, and filters
* Event Meals UX: Celebration special days surface meal attachment prominently so admins clearly see "Event Meal" creation

### Non-Goals

* Self-registration or password reset
* Historical reporting or analytics
* Push notifications or automated message delivery
* Meal menu or item-level tracking
* Data export (CSV, Excel)
* Mobile native app
* Multi-timezone support
* External authentication or SSO

---

## 5. Tech Stack and Rationale

**Core (unchanged)**
* **Runtime:** Node.js — predictable execution model, suitable for internal tools
* **Framework:** Express.js — minimal abstraction, easy to reason about and review
* **Authentication:** Session-based with httpOnly cookies. Works natively with same-origin React app
* **Storage:** File-based JSON — sufficient for ~100 users, transparent inspection, easy migration later

**Added (Iteration 2)**
* **Frontend:** React + Vite. Replaces server-rendered EJS. Lightweight, fast dev cycle, widely understood
* **State management:** Zustand. Minimal (~1KB), no boilerplate, works outside React components (needed for SSE handler). Follows senior guidance: "vanilla React with a store library"
* **Live updates:** Server-Sent Events. Native browser support, one-directional push, no extra library needed. Simpler than WebSockets for this read-heavy use case

**Removed**
* **Server-rendered UI (EJS):** replaced by React SPA

**Added (Iteration 3)**
* No new libraries or infrastructure. All new features are built on the same stack.
* Audit logs use the same `jsonStore.js` read/write pattern as all other data files, with monthly partitioning handled in `auditService.js` by computing the filename from the entry timestamp.

---

## 6. Scope of Changes

### Iteration 1 (completed)

* Express backend application bootstrap
* Authentication and role-based authorization middleware
* Meal participation business logic
* Aggregated headcount calculation
* JSON-based persistence layer
* Server-rendered UI for daily interaction
* Administrative user bootstrap via script-based user creation

### Iteration 2 (completed)

**Backend (modified)**
* Restructure all routes under `/api/` prefix, JSON-only responses
* Add meal availability service (rules-based computation)
* Add work location tracking (endpoints + service)
* Add special day management (CRUD endpoints)
* Add bulk override endpoint
* Add cutoff enforcement middleware
* Add SSE endpoint for live headcount push
* Add system settings management (cutoff time, Iftar periods, WFH periods)
* Add announcement generation endpoint
* Enhance headcount to include per-team and office/WFH breakdown
* Fix `optIn()` to retain record with `status: "IN"` instead of deleting (audit trail)
* Add `GET /api/auth/me` for frontend session check
* Serve React build output as static files in production

**Frontend (new)**
* React + Vite application
* Zustand stores for auth, meals, headcount, UI state
* SSE client for live updates
* Pages: Login, Employee Dashboard, Team View, Headcount Dashboard, Special Days, Settings, Announcement

**Data layer (new files)**
* `teams.json`: team definitions (id, name)
* `workLocations.json`: per-user per-date location records
* `specialDays.json`: holiday, closure, and celebration entries
* `settings.json`: cutoff time, Iftar periods, company WFH periods, off days

### Iteration 3 (this iteration)

**Backend (modified routes)**
* `POST /api/meals/:mealType/opt-out`, `POST /api/meals/:mealType/opt-in`, `POST /api/meals/override`, `POST /api/meals/bulk-override`, `POST /api/work-location`, `POST /api/work-location/override` — all emit an audit log entry after each successful mutation
* Forward window validation added for EMPLOYEE role: reject dates beyond `today + maxForwardPlanningDays` with 400 (TL and Admin exempt)

**Backend (new routes)**
* `GET /api/work-location/monthly-usage?month=YYYY-MM` — per-user WFH day counts, scoped by role
* `GET /api/reports/wfh-overage?month=YYYY-MM` — over-limit employees with rollup summary
* `GET /api/headcount/forecast?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` — per-date aggregates for Admin/Logistics
* `GET /api/dashboard/operational` — consolidated today + tomorrow + upcoming special days
* `GET /api/audit?userId=...&date=YYYY-MM-DD` — scoped change history for TL/Admin/Logistics

**Backend (new services)**
* `auditService.js` — append-only write and scoped read for monthly-partitioned `auditLogs-YYYY-MM.json` files

**Backend (data)**
* `settings.json` — add `maxForwardPlanningDays: 14` and `monthlyWfhAllowance: 5`
* `auditLogs-YYYY-MM.json` — new, monthly-partitioned, append-only

**Frontend (modified)**
* `DashboardPage.jsx` — add `max` date bound on date picker (today + `maxForwardPlanningDays`); show WFH usage fraction for current month with over-limit warning
* `TeamPage.jsx` — WFH over-limit badge per employee; "Show only over-limit" filter toggle; audit trail popover (history icon per meal cell)
* `HeadcountPage.jsx` — forecast section showing upcoming working days with per-meal headcounts
* `SpecialDaysPage.jsx` — relabel "Extra meals" → "Event Meals" with description text when type is Celebration

**Frontend (new)**
* `auditStore.js` — fetch and cache audit entries per userId + date

### Out of Scope

* Database migration
* Anything listed under non-goals

---

## 7. Requirements

### Functional Requirements

**Core (Iteration 1)**
* Users can view today's meal participation status
* Users can opt out of meals for the current day
* Authorized roles can override meal participation
* Logistics users can view aggregated headcounts only

**Team-based visibility (Iteration 2)**
* Employees see their own team name on the dashboard
* Team Leads see individual participation for their own team
* Admin sees individual participation across all teams
* Logistics sees only aggregated headcount per team (no individual names)

**Meal availability (Iteration 2)**
* Lunch and Snacks available on all working days (Mon-Fri, non-holiday, non-closed)
* Iftar defaults to IN during admin-declared Ramadan/Iftar period; defaults to OUT otherwise
* Outside a declared period, individual employees can opt IN to Iftar for personal fasting days
* Event Dinner and Optional Dinner available only when Admin enables them on a specific date
* Weekends (configurable, default Sat/Sun) and closed/holiday days show no meals

**Work location (Iteration 2)**
* Employees can set their location (Office/WFH) for any upcoming date before cutoff
* Default is Office (absence of record = Office)
* WFH employees are excluded from all meal headcounts
* Team Leads can correct work location for own team; Admin for anyone
* Admin can declare company-wide WFH periods; all employees default to WFH during those periods
* Employees can override to Office during a company WFH period (e.g., coming in for an event)

**Special days (Iteration 2)**
* Admin/Logistics can mark a date as Office Closed, Government Holiday, or Celebration
* Office Closed and Government Holiday disable all meals; headcount reads 0; UI shows banner
* Admin can still override individual entries on closed days (edge case: on-duty staff)
* Celebration days are working days with an optional note and optional extra meals enabled

**Bulk actions (Iteration 2)**
* Team Leads can bulk opt-out/in selected team members for a date range and selected meals
* Admins can do the same across all teams, including team leads

**Headcount reporting (Iteration 2)**
* Totals by meal type, by team, overall total, office vs WFH split
* Updates live via SSE when any participation or location change occurs

**Cutoff enforcement (Iteration 2)**
* Configurable cutoff time (default: 10:00 PM, day before the target date)
* After cutoff, employees cannot change their meal participation or work location
* Team Leads and Admins can still make changes after cutoff

**Announcement (Iteration 2)**
* Logistics/Admin can generate a formatted, copy-paste-ready message for a selected date
* Includes meal-wise totals, office/WFH split, and any special day notes
* Output uses markdown formatting (compatible with Discord, Slack, etc.)

**Future Planning & Forward Window (Iteration 3)**
* `maxForwardPlanningDays` (default: 14) stored in `settings.json` controls how far ahead employees can select dates.
* Frontend date picker enforces this via a `max` attribute. Backend also validates and returns 400 if exceeded.
* TL and Admin are exempt from the forward window — they may override on any future date.
* Cutoff per future date works correctly already: employee can edit a future date until `(targetDate − 1 day)` at `cutoffTime`.

**Headcount Forecast & Operational Dashboard (Iteration 3)**
* `GET /api/headcount/forecast` returns per-date aggregated headcounts for a requested date range. Admin/Logistics only.
* `GET /api/dashboard/operational` returns a consolidated view: today's headcount snapshot, tomorrow's forecast, and upcoming special days.
* The Headcount Page shows a forecast section below the daily view.

**Monthly WFH Allowance (Iteration 3)**
* `monthlyWfhAllowance` (default: 5) stored in `settings.json`.
* `GET /api/work-location/monthly-usage` returns per-user WFH day counts for a calendar month, scoped by role.
* Exceeding the allowance is a soft limit — entries are accepted but flagged. No hard block.
* Employee Dashboard shows WFH usage fraction (e.g., 3/5); over-limit shown in warning colour.
* Team View shows WFH fraction badge per employee; a "Show only over-limit" toggle filters the table.
* `GET /api/reports/wfh-overage` returns only over-limit employees with rollup: `overLimitCount`, `totalExtraDays`.

**Audit Trail (Iteration 3)**
* All mutation endpoints (opt-in, opt-out, override, bulk override, location change, location override) write an audit log entry after each successful state change.
* Audit entries: `id`, `timestamp`, `actorId`, `actorName`, `targetUserId`, `actionType`, `details`.
* Logs stored monthly-partitioned as `auditLogs-YYYY-MM.json` (partitioned by action timestamp, not target date).
* `GET /api/audit?userId=X&date=Y` returns scoped history. TL: own team only. Admin/Logistics: all. Employee: 403.
* In the Team View, each meal status cell has a history icon. Clicking opens a popover with the change timeline.

**Event Meals UX (Iteration 3)**
* No backend or data model changes. Event meals already work via the `meals` array on Celebration special days.
* Frontend only: the meal checkboxes section in the Special Days form is relabelled from "Extra meals" to "Event Meals" and a short description is added when type is Celebration.

### Role-Based Behavior

| Action | Employee | Team Lead | Admin | Logistics |
|--------|----------|-----------|-------|-----------|
| View own meals + location | Yes | Yes | Yes | Yes |
| Update own meals/location | Before cutoff | Before cutoff | Anytime | Before cutoff |
| View team participation | — | Own team (names) | All (names) | All (aggregated) |
| Override individual | — | Own team | All | — |
| Bulk override | — | Own team | All | — |
| Manage special days | — | — | Yes | Yes |
| Manage settings | — | — | Yes | — |
| View headcount dashboard | — | — | Yes | Yes |
| Generate announcement | — | — | Yes | Yes |
| View Audit Logs | — | Own team | All | All |
| View Monthly WFH usage | Own only | Own team | All | All |
| View WFH overage report | — | Own team | All | All |
| View forecast / operational dashboard | — | — | Yes | Yes |

### Validation Rules & Edge Cases

* Absence of a record implies opted-in (meals) or Office (location)
* Unauthorized overrides must be rejected
* All updates must record `updatedBy` and `updatedAt`
* Cutoff blocks employee self-service after configured time; TL/Admin bypass
* Bulk override rejects entirely if any target user is outside actor's scope
* Cannot opt in/out on Office Closed or Government Holiday (except Admin override)
* Iftar opt-in outside a declared period creates an explicit IN record (default is OUT)
* Company WFH period can be overridden individually (employee sets Office for a specific date)
* Duplicate special day entries for the same date rejected
* Work location change for past dates rejected for all roles
* Date selection beyond `maxForwardPlanningDays` from today returns 400 for EMPLOYEE role; TL/Admin exempt
* WFH entries beyond `monthlyWfhAllowance` are accepted but flagged — soft limit, not hard block
* Audit log entries written after successful mutation only; write failure is logged to stderr and does not roll back the primary change
* `GET /api/audit` without `date` param returns all entries for that user in the current month
* Forecast returns empty `meals` array for non-working days (weekends, closed days) — does not error

### Definition of Done

* Headcount matches default opt-in logic and correctly excludes WFH users
* Role and team restrictions enforced server-side
* Audit fields populated for all updates
* Aggregated view exposes no individual records to logistics
* Meal availability follows rules (working days, periods, events)
* Team views enforce privacy boundaries
* Bulk actions respect role scope
* Cutoff blocks employee changes after configured time
* SSE pushes updates to all connected clients on any state change
* Announcement produces valid, copy-paste-ready output
* All new endpoints enforce authentication and role checks

_Added in Iteration 3:_
* Forward window enforced server-side for EMPLOYEE; frontend date picker respects `max` bound
* Audit entries written for every mutation; `GET /api/audit` returns correctly scoped results
* Monthly WFH usage correctly counted per calendar month; over-limit flag accurate
* WFH fraction visible on Employee Dashboard; over-limit badge visible in Team View
* WFH overage report returns correct rollup (`overLimitCount`, `totalExtraDays`)
* Forecast returns headcounts for requested date range, Admin/Logistics only
* Operational dashboard returns today + tomorrow + upcoming special days
* Special Days form shows "Event Meals" label for Celebration type

---

## 8. User Flows

### Employee (daily)

1. Opens app, sees today's meals (Lunch, Snacks, plus Iftar if Ramadan or fasting toggle is on)
2. Sees work location: Office (default) or WFH
3. Sees WFH usage fraction for the current month (e.g., "WFH this month: 3 / 5"); if over limit, shown in warning colour
4. Toggles WFH if needed. Meals gray out, message shown
5. Opts out of specific meals if in office
6. If fasting outside Ramadan, toggles Iftar on. Iftar meal appears
7. Switches to a future date (up to `maxForwardPlanningDays` ahead) to plan meals or set WFH
8. After cutoff, sees "locked" banner, buttons disabled

### Team Lead

1. Sees own dashboard (same as employee)
2. Navigates to team view — each member shows WFH usage fraction; over-limit members show badge in warning colour
3. Toggles "Show only over-limit" to filter the table
4. Clicks the history icon next to a meal status → audit popover shows change timeline for that user+date
5. Clicks a meal status badge to toggle it (inline override)
6. For group changes, opens bulk action: selects members, meals, date range, then applies

### Logistics Coordinator

1. Opens app, lands on headcount dashboard with today's live numbers
2. Sees per-meal headcount cards, office/WFH split, per-team breakdown
3. Scrolls to forecast section: upcoming working days with per-meal headcounts and special day indicators
4. Clicks "Generate Announcement", previews formatted message, copies to clipboard
5. Views WFH overage report for the month: rollup summary + list of over-limit employees

### Admin

1. Everything Team Lead can do, across all teams
2. Creates a Celebration special day — form shows "Event Meals" section prominently with checkboxes
3. Configures settings: cutoff time, Iftar period dates, company WFH periods, `maxForwardPlanningDays`, `monthlyWfhAllowance`

### Failure Paths

* Employee changes meal after cutoff: 403 with message showing cutoff time
* Employee selects date beyond forward window: frontend blocks via `max` attribute; backend returns 400 if bypassed
* Team Lead overrides a user from another team: 403
* Employee requests audit log: 403
* TL requests audit for user from another team: 403
* Logistics requests individual participation details: response contains aggregated data only
* Employee interacts on Office Closed day: banner shown, no meal actions available
* Bulk override includes cross-team users (for TL): entire request rejected
* Work location change for a past date: 400

---

## 9. Design

### High-Level Architecture

**Iteration 1:**
```
Browser
  ↓
Server-rendered UI (EJS)
  ↓
Express Routes
  ↓
Auth & Role Middleware
  ↓
Service Layer
  ↓
JSON Storage
```

**Iteration 2:**
```
React SPA (Vite)
  ↓ API calls (fetch, same-origin cookies)
  ↓ SSE connection (EventSource)
Express API Server
  ↓
Auth Middleware → Role Middleware → Cutoff Middleware
  ↓
Service Layer
  ↓
JSON Storage
```

Dev: Vite proxies `/api/*` to Express.
Production: Express serves React's built static files alongside the API.

**Iteration 3 (additive):**
```
React SPA (Vite)
  ↓ API calls (fetch, same-origin cookies)
  ↓ SSE connection (EventSource)
Express API Server
  ↓
Auth Middleware → Role Middleware → Cutoff Middleware → Forward Window Check (EMPLOYEE)
  ↓
Service Layer  +  auditService (intercepts mutations, writes append-only log)
  ↓
JSON Storage  +  auditLogs-YYYY-MM.json (append-only, monthly-partitioned)
```

### Data Model

**User** (unchanged)

* `id`
* `name`
* `username`
* `passwordHash`
* `role` (EMPLOYEE | TEAM_LEAD | ADMIN | LOGISTICS)
* `teamId`

**Meal Participation** (updated)

* `userId`
* `date`
* `mealType`
* `status` (IN | OUT)
* `updatedBy`
* `updatedAt`

Absence of a record implies opted-in by default.
_Change in iteration 2: `optIn()` now writes `status: "IN"` instead of deleting the record, preserving the audit trail._

**Team** (new)
* `id` e.g., `"team-a"`
* `name` e.g., `"Engineering Alpha"`

**WorkLocation** (new)
* `userId`
* `date` (YYYY-MM-DD)
* `location` (OFFICE | WFH)
* `updatedBy`
* `updatedAt`

Absence of record = OFFICE.

**SpecialDay** (new)
* `date` (YYYY-MM-DD, unique)
* `type` (OFFICE_CLOSED | GOVT_HOLIDAY | CELEBRATION)
* `note` (optional)
* `meals` (optional array of extra meals enabled, e.g., `["EVENT_DINNER"]`)
* `createdBy`
* `createdAt`

**Settings** (modified in Iteration 3)
* `cutoffTime`: `"22:00"` (HH:mm) — unchanged
* `iftarPeriods`: `[{ startDate, endDate, label }]` — unchanged
* `companyWfhPeriods`: `[{ startDate, endDate, reason, createdBy, createdAt }]` — unchanged
* `offDays`: `[0, 6]` (Sunday, Saturday) — unchanged
* `maxForwardPlanningDays`: `14` — **new**
* `monthlyWfhAllowance`: `5` — **new**

**AuditLog** (new, Iteration 3, append-only, monthly-partitioned)

Stored as `auditLogs-YYYY-MM.json` (e.g., `auditLogs-2026-02.json`). Partitioned by the action's timestamp month, not the target date. Prevents unbounded file growth; reads are scoped to the relevant month.

* `id`: unique string (e.g., `"log-1740300000000-x7k"`)
* `timestamp`: ISO 8601 UTC (when the action happened)
* `actorId`: user ID of who performed the action
* `actorName`: display name of actor (denormalized at write time — immutable in log)
* `targetUserId`: user ID whose record was changed
* `actionType`: `"MEAL_OPT_OUT" | "MEAL_OPT_IN" | "MEAL_OVERRIDE" | "BULK_OVERRIDE" | "LOCATION_CHANGE" | "LOCATION_OVERRIDE"`
* `details`: `{ date, mealType?, status?, location? }`

**Derived: Meal Availability (computed per date, not stored)**

| Condition | Meals Available | Default Status |
|-----------|----------------|----------------|
| Weekend / Office Closed / Govt Holiday | None | — |
| Normal working day | Lunch, Snacks | IN |
| During Iftar period | + Iftar | IN |
| Outside Iftar period | + Iftar | OUT |
| Celebration with enabled meals | + those meals | IN (Event Dinner), OUT (Optional Dinner) |

Headcount formula:
* Default-IN meals: `officeUsers − optedOutOfficeUsers`
* Default-OUT meals: `optedInOfficeUsers`

Where `officeUsers` = users whose resolved location is OFFICE (individual record > company WFH period > default OFFICE).

### Interfaces

**Iteration 1 (original)**
* `POST /auth/login`
* `POST /meals/:mealType/out`
* `POST /meals/:mealType/override`
* `GET /headcount`

**Iteration 2 (all routes under `/api/` prefix)**

Auth:
* `GET /api/auth/me` returns current user or 401
* `POST /api/auth/login` `{ username, password }`
* `POST /api/auth/logout`

Meals:
* `GET /api/meals?date=YYYY-MM-DD` user's meal status + available meals
* `POST /api/meals/:mealType/opt-out` `{ date? }`
* `POST /api/meals/:mealType/opt-in` `{ date? }`
* `POST /api/meals/override` `{ targetUserId, mealType, status, date? }`
* `POST /api/meals/bulk-override` `{ userIds, mealTypes, status, startDate, endDate }`

Work Location:
* `GET /api/work-location?date=YYYY-MM-DD` user's location
* `POST /api/work-location` `{ date, location }`
* `POST /api/work-location/override` `{ targetUserId, date, location }`

Headcount:
* `GET /api/headcount?date=YYYY-MM-DD`

Team:
* `GET /api/team/participation?date=YYYY-MM-DD` scoped by role

Special Days:
* `GET /api/special-days?month=YYYY-MM`
* `POST /api/special-days` `{ date, type, note?, meals? }`
* `PUT /api/special-days/:date`
* `DELETE /api/special-days/:date`

Settings:
* `GET /api/settings`
* `PUT /api/settings` Admin only

Announcement:
* `GET /api/announcement?date=YYYY-MM-DD`

Live Updates:
* `GET /api/events/stream` SSE connection

Events emitted: `headcount-update`, `special-day-change`. Client re-fetches data on event (keeps events small, avoids stale state).

**Iteration 3 Endpoints (new)**

WFH Monitoring:
* `GET /api/work-location/monthly-usage?month=YYYY-MM` — Employee (own), TL (own team), Admin/Logistics (all). Response: `{ month, allowance, users: [{ userId, name, teamId, wfhDays, overLimit, extraDays? }] }`
* `GET /api/reports/wfh-overage?month=YYYY-MM` — TL (own team), Admin/Logistics (all). Response: `{ month, allowance, summary: { overLimitCount, totalExtraDays }, employees: [...] }`

Forecast:
* `GET /api/headcount/forecast?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` — Admin/Logistics only. Response: `{ startDate, endDate, days: [{ date, specialDay, officeCount, wfhCount, meals: [{ type, headcount }] }] }`

Operational Dashboard:
* `GET /api/dashboard/operational` — Admin/Logistics only. Response: `{ today: {...}, tomorrow: {...}, activeSpecialDays: [...] }`

Audit:
* `GET /api/audit?userId=X&date=YYYY-MM-DD` — TL (own team only), Admin, Logistics. Response: `{ userId, date, entries: [{ id, timestamp, actorId, actorName, actionType, details }] }`

**Example: GET /api/headcount?date=2026-02-16**

```json
{
  "date": "2026-02-16",
  "specialDay": null,
  "totalUsers": 100,
  "officeCount": 92,
  "wfhCount": 8,
  "meals": [
    { "type": "LUNCH", "default": "IN", "headcount": 87 },
    { "type": "SNACKS", "default": "IN", "headcount": 82 },
    { "type": "IFTAR", "default": "OUT", "headcount": 5 }
  ],
  "byTeam": [
    { "teamId": "team-a", "name": "Engineering Alpha", "officeCount": 12, "wfhCount": 1 },
    { "teamId": "team-b", "name": "Engineering Beta", "officeCount": 15, "wfhCount": 2 }
  ]
}
```

Error responses: 400 (invalid input), 401 (not authenticated), 403 (role/scope/cutoff violation), 404 (not found), 409 (duplicate special day).

### User Provisioning

User accounts are created via a script-based administrative process.
There is no self-service or UI-based registration.

The script writes directly to the JSON storage layer and applies the same
password hashing and validation rules as runtime authentication.

---

## 10. Key Decisions and Trade-offs

**Carried from Iteration 1:**
* File-based storage over database — avoids infra overhead, sufficient for ~100 users
* Default opt-in model — reduces data volume and prevents incorrect opt-outs
* Single office time zone — simplifies definition of "today"

**Added in Iteration 2:**

1. **Meal availability is computed from rules, not stored per-day.** Avoids requiring admin to configure 260+ working days per year. Ramadan dates set once, holidays marked as needed, everything else is automatic. _Alternative: per-day config, rejected for operational overhead._

2. **Iftar has a context-dependent default.** ON during declared Iftar periods (Ramadan), OFF otherwise. Covers both the common case (Ramadan: most people fast) and the individual case (personal fasting days outside Ramadan). _Alternative: always visible, always default OFF. Rejected because it forces 90+ people to toggle during Ramadan._

3. **Work location defaults to Office.** Same sparse-record pattern as meals. Most people are in office most days, so we only track exceptions. _Alternative: require daily check-in, rejected for the friction it adds._

4. **SSE over WebSockets.** Headcount updates flow server to client only. SSE is native, auto-reconnects, needs no library. _Alternative: WebSockets (overkill for one-way push) or polling (wasteful)._

5. **Zustand over Redux.** ~1KB, no boilerplate, works outside components (SSE handler can update store directly). _Alternative: Redux, over-engineered for this scale._

6. **Backend becomes a pure API server.** EJS templates replaced by React SPA. Cleaner separation, enables live updates. _Alternative: keep EJS + bolt on AJAX, rejected as a half-measure._

7. **`optIn()` retains records** with `status: "IN"` instead of deleting. Full audit trail for every state change. Storage cost is negligible.

8. **Single cutoff time for all meals and location changes.** One rule to communicate, one rule to enforce. _Alternative: per-meal cutoff, unnecessary complexity._

**Added in Iteration 3:**

9. **Forward window as soft frontend constraint, hard backend check.** The `max` attribute on the date picker prevents accidental over-selection. The backend validates independently so it cannot be bypassed via API. TL and Admin are exempt because operational corrections sometimes need further lookahead. _Alternative: enforce for all roles — rejected because TLs need to bulk-override schedules ahead of events._

10. **Audit partitioned by log timestamp month, not target date.** A correction made in March for a February meal goes into `auditLogs-2026-03.json`. Simplifies write path (one file per calendar month of action) and ensures "what happened this month" is always a single-file read. _Alternative: partition by target date — more complex write logic, harder to query recent changes._

11. **Audit write is non-blocking.** If `auditService.logAction()` throws, the error is caught and logged to stderr. The primary mutation is not rolled back. An audit infra issue should not break the core workflow for 100 employees. _Alternative: roll back on audit failure — rejected because audit is observational, not transactional._

12. **WFH allowance is a soft limit.** The system never blocks a WFH entry that would push someone over 5 days. It flags the overage in the UI and reports. The 5-day limit is a policy guideline; HR uses the overage report to enforce it, not the system. _Alternative: hard block after 5 days — rejected because edge cases require admin workarounds for every exception._

13. **Operational dashboard is a dedicated endpoint, not composed on the frontend.** `GET /api/dashboard/operational` computes today, tomorrow, and upcoming special days in one round-trip, reducing API calls on the Logistics person's most-used view from 3+ to 1. _Alternative: have the frontend compose from existing endpoints — more latency, more failure surface._

14. **Audit trail UI is a popover on Team View, not a separate page.** Audit detail is contextual — it makes most sense when looking at a specific record in the team table. A popover keeps the context intact. _Alternative: dedicated audit page — more discoverable but adds navigation overhead for the common case._

---

## 11. Security and Access Control

**Core (unchanged)**
* All protected routes require authentication
* Authorization enforced at API level
* Team scoping enforced for Team Lead actions
* Logistics role restricted to aggregated data only
* Secrets never stored in code or logs

**Added (Iteration 2)**
* All new endpoints enforce role checks via middleware
* Bulk override validates every target user is within actor's scope before executing any changes
* SSE endpoint requires valid session (cookie sent automatically on EventSource connection)
* Settings endpoint restricted to ADMIN
* Special day management restricted to ADMIN and LOGISTICS
* Cutoff enforcement is server-side. Frontend disables buttons as a UX hint, but the real gate is middleware
* Logistics API responses never contain individual user IDs or names
* Work location data follows same access rules as meal participation

**Added (Iteration 3)**
* Forward window validation enforced server-side for EMPLOYEE role; TL/Admin bypass
* `GET /api/audit` validates: authenticated → role check (Employee → 403) → TL scoped to own team → results returned
* `GET /api/work-location/monthly-usage` and `GET /api/reports/wfh-overage` validate role scope: Employee sees only self, TL sees own team, Admin/Logistics see all
* `actorName` denormalized into audit log at write time — not re-resolved at read time (audit records are immutable)

---

## 12. Testing Plan

### Unit Tests (core logic)

* Headcount calculation, role checks _(iteration 1)_
* Meal availability: working day vs weekend vs holiday vs Iftar period
* Headcount: default-IN vs default-OUT meals, WFH exclusion
* Cutoff time validation
* Bulk override scope (TL team boundary)

### Integration Tests (key flows)

* Override flows per role _(iteration 1)_
* Employee meal change after cutoff returns 403
* TL override own team returns 200, cross-team returns 403
* Logistics GET participation returns aggregated only
* Work location WFH user excluded from headcount

### Smoke Test (manual)

1. Employee: set WFH, meals grayed out. Set Office, meals active
2. Admin: mark day as Office Closed, employee sees banner, no actions
3. TL: bulk opt-out team for a date range, headcount drops
4. Open headcount page, employee opts out in another tab, number updates live

_Added in Iteration 3:_

### Unit Tests (Iteration 3)

* `auditService.logAction()` — writes correct entry to correct monthly file
* `auditService.getAuditEntries()` — returns scoped entries, respects TL team boundary
* Monthly WFH usage — correctly counts WFH days, sets `overLimit` flag, computes `extraDays`
* Forward window check — dates within window pass; dates beyond return 400; TL/Admin exempt

### Integration Tests (Iteration 3)

* Employee sets WFH for day+3 → 200; for day+15 (with default 14-day window) → 400
* TL overrides a meal → audit entry written; TL queries audit for own team member → 200 with entries
* TL queries audit for user from another team → 403
* Employee queries audit → 403
* WFH overage report returns correct `overLimitCount` and `totalExtraDays`
* Forecast for range including a holiday returns that day with empty `meals` array

### Smoke Tests (Iteration 3, manual)

1. Employee: select a date 10 days ahead, set WFH. Confirm usage fraction updates
2. TL: override a meal. Open audit popover — see override entry with actor name and timestamp
3. Admin: set `monthlyWfhAllowance: 2`. Set 3 WFH days for an employee. Confirm "WFH 3/2" warning badge in Team View
4. Logistics: confirm forecast section shows upcoming days correctly on Headcount Page
5. Admin: create Celebration special day — confirm form shows "Event Meals" label
6. Employee: select date beyond forward window — date picker blocks. Confirm 400 from API if bypassed

---

## 13. Operations

* **Configuration:** existing env vars (PORT, SESSION_SECRET, NODE_ENV). Runtime settings (cutoff, periods) managed via `/api/settings` and stored in `settings.json`
* **Deployment:** local execution. `npm run build` in frontend produces static files. Express serves them
* **Rollback:** new JSON files (workLocations, specialDays, settings) are additive. Deleting them resets to defaults without affecting existing data
* **Audit log growth (Iteration 3):** one file per month, ~50 bytes per entry. At 100 users × 3 actions/day × 22 working days ≈ 16 KB/month. Negligible. Removing a monthly file loses audit history but does not affect participation data.
* **New settings fields (Iteration 3):** `maxForwardPlanningDays` and `monthlyWfhAllowance` have code-level defaults if absent from `settings.json`, so existing deployments without these fields continue to work.

---

## 14. Risks, Assumptions, Open Questions

### Risks

* **SSE connection limits:** browsers cap ~6 connections per domain. One connection per tab is fine for internal use
* **Scope creep from "special day" flexibility:** celebrations with custom meals could get complex. Keeping the model simple (just an enabled-meals array) limits this
* **Audit write contention (Iteration 3):** simultaneous mutations both append to the same monthly file. The existing `jsonStore.js` write lock serializes all writes — this is covered.
* **Forward window + bulk override (Iteration 3):** a TL bulk-overrides a date 20 days ahead. TL is exempt from the forward window by design, so this is allowed. Worth monitoring.

### Assumptions

* Single office location and timezone (Asia/Dhaka)
* ~100 employees, low concurrent usage
* All users provisioned via script (no self-registration)
* Breakfast is always available and not tracked in the system
* LOGISTICS role users are counted in meal headcount (role is app access level, not a dietary exception)
* WFH means excluded from all meals (no partial WFH-but-eating-at-office scenario)
* Weekends are Saturday and Sunday (configurable in settings)

### Open Questions

1. **Celebration auto-enabling Event Dinner?** Should creating a celebration auto-add Event Dinner, or should admin always add meals manually? My take: manual. Not every celebration needs dinner, so keeping it flexible makes more sense.
2. **Iftar during Ramadan for non-fasting employees.** Should they need to opt out, or should Iftar only target those who fast? My take: default ON for everyone during Ramadan, non-fasting employees opt out. Simpler model, and the kitchen prepares for all by default.
3. **Settings page for new Iteration 3 fields.** Should `maxForwardPlanningDays` and `monthlyWfhAllowance` be editable via the Settings UI? My take: yes — they are policy values Admin should control without touching files directly.
4. **Audit log retention.** Do old monthly audit files need pruning? At ~16 KB/month they accumulate negligibly. Revisit if the system runs for years.
5. **Forecast upper bound.** Should `GET /api/headcount/forecast` be capped at `maxForwardPlanningDays`, or can Admin/Logistics request longer ranges? My take: cap internally at the forward window for consistency, but allow passing `endDate` freely — the endpoint enforces the limit.

---

## 15. Appendix

### Meal Types and Behavior

| Meal | When Available | Default | Headcount Formula |
|------|---------------|---------|-------------------|
| Lunch | Working days | IN | officeUsers - optedOut |
| Snacks | Working days | IN | officeUsers - optedOut |
| Iftar | During Iftar period | IN | officeUsers - optedOut |
| Iftar | Outside Iftar period | OUT | optedIn (office only) |
| Event Dinner | Admin-enabled dates | IN | officeUsers - optedOut |
| Optional Dinner | Admin-enabled dates | OUT | optedIn (office only) |

Breakfast is intentionally excluded due to lack of procurement impact.

### Special Day Effects

| Type | Meals | Location Tracking | Headcount |
|------|-------|-------------------|-----------|
| Office Closed | Disabled | N/A | 0 |
| Government Holiday | Disabled | N/A | 0 |
| Celebration | Normal + optional Event Meals | Normal | Normal calculation |

### AuditLog Action Types (Iteration 3)

| actionType | Triggered by | Key `details` fields |
|------------|-------------|----------------------|
| `MEAL_OPT_OUT` | Employee opts out of own meal | `date`, `mealType` |
| `MEAL_OPT_IN` | Employee opts into own meal | `date`, `mealType` |
| `MEAL_OVERRIDE` | TL or Admin overrides a single record | `date`, `mealType`, `status` |
| `BULK_OVERRIDE` | TL or Admin bulk override | `startDate`, `endDate`, `mealTypes`, `status` |
| `LOCATION_CHANGE` | Employee sets own location | `date`, `location` |
| `LOCATION_OVERRIDE` | TL or Admin corrects location | `date`, `location` |

### Sample Announcement (markdown, e.g., Discord)

**Regular day:**
```
**Meal Headcount — Monday, 16 Feb 2026**

Lunch: 87
Snacks: 82
Iftar: 5

In office: 92 · WFH: 8
Total: 100

Regular working day.
```

**Ramadan day with event:**
```
**Meal Headcount — Thursday, 19 Mar 2026**
Ramadan

Lunch: 45
Snacks: 45
Iftar: 88
Event Dinner: 75

In office: 95 · WFH: 5
Total: 100

Note: Company Iftar event — Event Dinner enabled.
```