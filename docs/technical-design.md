# Meal Headcount Planner — Technical Design

- **Author:** Mehedi Hasan
- **Date:** 2026-02-15
- **Version:** 2.0
- **Status:** Draft (PR Ready)

**Links**

* Iteration 1 PR: [docs: add authoritative technical design for MHP iteration 1](https://github.com/mehedi-1101/meal-headcount-planner/pulls)
* Iteration 1 Issue: [#2](https://github.com/mehedi-1101/meal-headcount-planner/issues/2)
* Iteration 2 PR: _TBD_
* Iteration 2 Issue: _TBD_

---

## 2. Summary

The Meal Headcount Planner is an internal system for collecting daily meal participation data with a default opt-in model. It supports role-based access, team-scoped overrides, and aggregated headcount visibility for logistics.

Iteration 1 established the core: correct headcounts, role-based permissions, audit trail, and JSON-based storage.

Iteration 2 extends this with team-scoped participation views, special day management, work location tracking, and a rules-based meal availability model. It adds cutoff enforcement, bulk override actions, live headcount updates via SSE, and a copy-paste-friendly daily announcement generator. The server-rendered EJS frontend is replaced by a React SPA.

---

## 3. Problem Statement

The original Excel-based meal tracking process was error-prone, lacked auditability, and required manual coordination between employees, team leads, and logistics. Incorrect headcounts directly impact procurement and operational planning.

Iteration 1 addressed the core gaps: centralized data, role-aware access, correct daily headcounts.

What remains: there's no way to handle holidays or office closures, no visibility into team-level participation, no distinction between office and WFH employees, and every interaction requires a full page reload. The tool needs to be faster, smarter about which meals apply on a given day, and capable of producing the daily announcement that gets shared with the team (e.g., via Discord).

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

### Iteration 2 (current)

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

---

## 8. User Flows

### Employee (daily)

1. Opens app, sees today's meals (Lunch, Snacks, plus Iftar if Ramadan or fasting toggle is on)
2. Sees work location: Office (default) or WFH
3. Toggles WFH if needed. Meals gray out, message shown
4. Opts out of specific meals if in office
5. If fasting outside Ramadan, toggles Iftar on. Iftar meal appears
6. After cutoff, sees "locked" banner, buttons disabled

### Team Lead

1. Sees own dashboard (same as employee)
2. Navigates to team view, sees each member's location and meal status
3. Clicks a member's meal status to toggle it (inline override)
4. For group changes, opens bulk action: selects members, meals, date range, then applies

### Logistics Coordinator

1. Opens app, lands on headcount dashboard with today's live numbers
2. Sees per-meal headcount cards, office/WFH split, per-team breakdown
3. Numbers update in real-time as employees make changes
4. Clicks "Generate Announcement", previews formatted message, copies to clipboard

### Admin

1. Everything Team Lead can do, across all teams
2. Manages special days: marks holidays, creates celebrations with optional event meals
3. Configures settings: cutoff time, Iftar period dates, company WFH periods

### Failure Paths

* Employee changes meal after cutoff: 403 with message showing cutoff time
* Team Lead overrides a user from another team: 403
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

**Settings** (new, single object)
* `cutoffTime`: `"22:00"` (HH:mm)
* `iftarPeriods`: `[{ startDate, endDate, label }]`
* `companyWfhPeriods`: `[{ startDate, endDate, reason, createdBy, createdAt }]`
* `offDays`: `[0, 6]` (Sunday, Saturday)

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

---

## 13. Operations

* **Configuration:** existing env vars (PORT, SESSION_SECRET, NODE_ENV). Runtime settings (cutoff, periods) managed via `/api/settings` and stored in `settings.json`
* **Deployment:** local execution. `npm run build` in frontend produces static files. Express serves them
* **Rollback:** new JSON files (workLocations, specialDays, settings) are additive. Deleting them resets to defaults without affecting existing data

---

## 14. Risks, Assumptions, Open Questions

### Risks

* **SSE connection limits:** browsers cap ~6 connections per domain. One connection per tab is fine for internal use
* **Scope creep from "special day" flexibility:** celebrations with custom meals could get complex. Keeping the model simple (just an enabled-meals array) limits this

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
| Celebration | Normal + optional extras | Normal | Normal calculation |

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
