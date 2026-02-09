# Meal Headcount Planner (MHP)

## Technical Design Document — Iteration 1


## 1. Overview

### 1.1 Purpose

The Meal Headcount Planner (MHP) is an internal web application intended to replace the existing Excel-based process for collecting and calculating daily meal headcounts for employees.

The primary objective is to provide a **correct, auditable, and role-aware system** that enables accurate meal planning and logistics coordination, while keeping operational and implementation complexity intentionally low.

Iteration 1 focuses on:

* Daily meal participation (default opt-in)
* Role-based access and overrides
* Same-day headcount visibility

This iteration deliberately avoids over-engineering and serves as a **foundation** for future enhancements such as cutoffs, calendars, reporting, and automation.

---

## 1.2 Scope of Iteration 1

### In Scope

* User authentication with role-based access
* Daily meal participation (default opt-in, explicit opt-out)
* Support for multiple meal types
* Manual override by Team Leads and Admins
* Aggregated headcount view for Logistics/Admin
* File-based JSON storage
* Local execution

### Explicitly Out of Scope (Non-Goals)

* Notifications or alerts
* Historical reporting beyond “today”
* Meal cutoff enforcement
* Holiday / office-closed automation
* Meal availability configuration per day
* Data export (CSV, Excel)
* External authentication or SSO

---

## 2. Confirmed Requirements

These requirements are based on direct clarification from the project stakeholders and are considered fixed for Iteration 1.

---

## 2.1 Roles & Permissions Hierarchy

| Role      | Capabilities                                            |
| --------- | ------------------------------------------------------- |
| Employee  | View today’s meals, update own meal participation       |
| Team Lead | Update meal participation for **own team members only** |
| Admin     | Full override permissions across all users              |
| Logistics | View **aggregated headcount only** (read-only)          |

**Permission hierarchy:**
`Admin > Team Lead > Employee`

The **Logistics** role is intentionally restricted to aggregated data and cannot view or modify individual employee records.

---

## 2.2 Override Visibility & Audit Representation

* Employees **will not receive notifications** when their meal status is changed by others in Iteration 1.
* All updates must be represented at the **data layer**, including:

  * `updatedBy`
  * `updatedAt`

This ensures auditability and future transparency without adding UI complexity in the first iteration.

---

## 3. Design Assumptions & Decisions

The following decisions are explicitly documented to remove ambiguity and unblock development.

---

### 3.1 Time Zone Handling

**Decision**

* The system operates on a single, office-defined time zone (e.g., `Asia/Dhaka`).

**Rationale**

* Meal planning is tied to a physical office.
* User device time zones are unreliable.
* Simplifies the definition of “today”.

---

### 3.2 Work Schedule & Weekends

**Decision**

* No automatic disabling of weekends or holidays in Iteration 1.
* Meals are shown every day by default.

**Rationale**

* Office-closed rules are not fully defined.
* Prevents premature enforcement of business policy.
* Allows later extension via calendar rules.

---

### 3.3 Meal Scope

**Decision**

* Breakfast is excluded from the system.

**Included meal types**

* Lunch
* Snacks
* Iftar
* Event Dinner
* Optional Dinner

**Rationale**

* Breakfast does not require procurement planning.
* Including it adds noise without operational value.

---

### 3.4 Meal Availability Per Day

**Decision**

* All defined meal types are assumed available every day.
* No per-day enable/disable logic in Iteration 1.

**Rationale**

* Keeps the iteration focused.
* Daily configuration can be added later without breaking the model.

---

### 3.5 Cutoff Time

**Decision**

* No cutoff enforcement in Iteration 1.
* Data model must remain compatible with future cutoff rules.

**Rationale**

* Cutoff rules are explicitly deferred.
* Avoids speculative logic.

---

## 4. Technical Stack

### 4.1 Backend

* **Runtime:** Node.js
* **Framework:** Express.js

**Justification**

* Minimal abstraction
* Predictable execution model
* Easy to reason about and review
* Sufficient for internal, low-scale usage

---

### 4.2 Authentication

* Session-based authentication
* Username/password with secure hashing

**Justification**

* Simpler than token-based auth for internal tools
* Avoids unnecessary frontend complexity in Iteration 1

---

### 4.3 Storage

* File-based JSON storage
* Centralized access through a storage/service layer

**Justification**

* Low data volume (~100 employees)
* Easy inspection and debugging
* Clear migration path to a database later

---

### 4.4 UI Strategy (Iteration 1)

* Server-rendered pages
* Minimal UI logic
* Backend is the single source of truth

**Rationale**

* Reduces setup and learning overhead
* Ensures correctness and authorization are never bypassed
* Keeps frontend optional for later iterations

---

## 5. Repository Structure

The project uses a **single repository with a backend-first structure**, intentionally designed to support a future frontend (e.g., React) without backend refactoring.

```
mhp/
 ├─ backend/
 │   ├─ src/
 │   │   ├─ app.js              # Express bootstrap
 │   │   ├─ routes/             # HTTP route definitions
 │   │   │   ├─ auth.js
 │   │   │   ├─ meals.js
 │   │   │   └─ headcount.js
 │   │   ├─ middleware/         # Auth & role checks
 │   │   │   └─ auth.js
 │   │   ├─ services/           # Business logic
 │   │   │   ├─ userService.js
 │   │   │   └─ mealService.js
 │   │   ├─ storage/            # JSON access layer
 │   │   │   └─ jsonStore.js
 │   │   └─ views/              # Server-rendered UI
 │   ├─ data/                   # JSON data files
 │   └─ package.json
 ├─ docs/
 └─ README.md
```

---

## 6. Data Model (Conceptual)

### 6.1 User

* `id`
* `name`
* `role` (EMPLOYEE | TEAM_LEAD | ADMIN | LOGISTICS)
* `teamId`

---

### 6.2 Meal Participation

* `userId`
* `date`
* `mealType`
* `status` (IN | OUT)
* `updatedBy`
* `updatedAt`

**Important Rule**

* Absence of a record implies **opted-in by default**.

---

## 7. Headcount Calculation Logic

For a given date and meal type:

```
Headcount =
  Total eligible employees
  − Explicit opt-out records
```

This avoids unnecessary pre-population, minimizes storage, and guarantees correctness.

---

## 8. Security & Access Control

* All protected routes require authentication
* Role and team-based authorization enforced at API level
* UI visibility is role-aware but never trusted
* Logistics users can access aggregated data only

---

## 9. High-Level Request Flow

```
Browser
  ↓
Server-rendered UI
  ↓
Express Routes
  ↓
Auth & Role Middleware
  ↓
Service Layer
  ↓
JSON Storage
```

This ensures a single source of truth for business rules and authorization.

---

## 10. Risks & Mitigations

| Risk                     | Mitigation                           |
| ------------------------ | ------------------------------------ |
| Ambiguous business rules | Explicit assumptions documented      |
| Incorrect headcount      | Default opt-in logic clearly defined |
| Future scope expansion   | Extensible data model and layering   |

---

## 11. Summary

Iteration 1 of MHP prioritizes **correctness, clarity, and auditability** over feature richness.
The system is intentionally simple, backend-driven, and extensible, forming a strong and reviewable foundation for future iterations.
