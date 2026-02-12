# Meal Headcount Planner - Iteration 1 Technical Spec

- **Author:** Mehedi Hasan
- **Date:** 2026-02-10
- **Version:** 1.0
- **Status:** Draft (PR Ready)

**Links**

* PR: [docs: add authoritative technical design for MHP iteration 1](https://github.com/mehedi-1101/meal-headcount-planner/pulls)
* Issue/Ticket: [ #2](https://github.com/mehedi-1101/meal-headcount-planner/issues/2)

---

## 2. Summary

This iteration introduces a backend-driven internal system for collecting daily meal participation data with a default opt-in model. The system supports role-based access, team-scoped overrides, and aggregated headcount visibility for logistics. Iteration 1 prioritizes correctness, auditability, and simplicity, intentionally deferring cutoffs, reporting, and automation. It establishes a clean foundation for future enhancements without over-engineering.

---

## 3. Problem Statement

The current Excel-based meal tracking process is error-prone, lacks auditability, and requires manual coordination between employees, team leads, and logistics. Incorrect headcounts directly impact procurement and operational planning. There is no reliable single source of truth or role-aware control mechanism.

This iteration addresses these gaps by providing a centralized, role-aware system that produces correct daily headcounts with minimal operational complexity.

---

## 4. Goals and Non-Goals

### Goals

* Provide a correct and auditable daily meal headcount
* Support default opt-in with explicit opt-out
* Enforce role-based and team-based permissions
* Allow manual overrides by authorized roles
* Expose aggregated headcount data for logistics

### Non-Goals

* Notifications or alerts
* Historical reporting beyond “today”
* Meal cutoff enforcement
* Holiday or office-closed automation
* Meal availability configuration per day
* Data export (CSV, Excel)
* External authentication or SSO

---

## 5. Tech Stack and Rationale

* **Runtime:** Node.js — predictable execution model, suitable for internal tools
* **Framework:** Express.js — minimal abstraction, easy to reason about and review
* **Authentication:** Session-based auth — simpler than token-based auth for server-rendered UI
* **Storage:** File-based JSON — low data volume, transparent inspection, easy migration later
* **UI:** Server-rendered pages — avoids frontend auth duplication and reduces setup overhead

---

## 6. Scope of Changes

### In Scope

* Express backend application bootstrap
* Authentication and role-based authorization middleware
* Meal participation business logic
* Aggregated headcount calculation
* JSON-based persistence layer
* Server-rendered UI for daily interaction
* Administrative user bootstrap via script-based user creation

### Out of Scope

* Any feature listed under non-goals
* Database or cloud infrastructure setup

---

## 7. Requirements

### Functional Requirements

* Users can view today’s meal participation status
* Users can opt out of meals for the current day
* Authorized roles can override meal participation
* Logistics users can view aggregated headcounts only

### Role-Based Behavior

* **Employee:** Update own meal participation
* **Team Lead:** Update meal participation for own team members only
* **Admin:** Full override permissions across all users
* **Logistics:** Read-only access to aggregated headcount data

### Validation Rules & Edge Cases

* Absence of a record implies opted-in
* Unauthorized overrides must be rejected
* All updates must record `updatedBy` and `updatedAt`

### Definition of Done

* Headcount matches default opt-in logic
* Role and team restrictions enforced server-side
* Audit fields populated for all updates
* Aggregated view exposes no individual records to logistics

---

## 8. User Flows

### Employee (Happy Path)

1. Logs in
2. Views today’s meals
3. Opts out of a meal

### Team Lead

1. Logs in
2. Selects a team member
3. Overrides meal participation for that member

### Logistics

1. Logs in
2. Views aggregated headcount per meal

### Failure Paths

* Unauthorized override attempt
* Access to individual records by logistics
* Invalid or missing authentication

---

## 9. Design

### High-Level Architecture

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

### Data Model

**User**

* `id`
* `name`
* `role` (EMPLOYEE | TEAM_LEAD | ADMIN | LOGISTICS)
* `teamId`

**Meal Participation**

* `userId`
* `date`
* `mealType`
* `status` (IN | OUT)
* `updatedBy`
* `updatedAt`

**Important Rule:** Absence of a record implies opted-in by default.

### Interfaces (Illustrative)

* `POST /auth/login`
* `POST /meals/:mealType/out`
* `POST /meals/:mealType/override`
* `GET /headcount`

Error cases return appropriate HTTP status codes (401, 403, 400).

### User Provisioning (Iteration 1)

User accounts are created via a script-based administrative process.
There is no self-service or UI-based registration in Iteration 1.

This approach:
- Keeps authentication and authorization simple
- Avoids unnecessary UI and validation complexity
- Matches internal tooling usage patterns

The script writes directly to the JSON storage layer and applies the same
password hashing and validation rules as runtime authentication.

---

## 10. Key Decisions and Trade-offs

* File-based storage over database — avoids infra overhead in early iteration
* Default opt-in model — reduces data volume and prevents incorrect opt-outs
* No cutoff enforcement — avoids premature business rule assumptions
* Single office time zone — simplifies definition of “today”

Alternatives (DB, frontend-heavy UI, cutoff logic) were intentionally deferred.

---

## 11. Security and Access Control

* All protected routes require authentication
* Authorization enforced at API level
* Team scoping enforced for Team Lead actions
* Logistics role restricted to aggregated data only
* Secrets never stored in code or logs

---

## 12. Testing Plan

* **Unit Tests:** Headcount calculation, role checks
* **Integration Tests:** Override flows per role
* **Manual QA:** Login → opt-out → verify aggregate → override → verify audit fields

---

## 13. Operations

* **Logging:** request ID, user ID, action type
* **Monitoring:** error rate and request latency (basic)
* **Configuration:** environment variables for port and session secret
* **Deployment:** local execution only for Iteration 1

---

## 14. Risks, Assumptions, Open Questions

### Risks

* Ambiguous future business rules
* Misuse of overrides without visibility

### Assumptions

* Single office location and time zone
* Low concurrent usage

### Open Questions

* Should logistics see per-meal or per-day-only aggregates?

---

## 15. Appendix

### Meal Types (Iteration 1)

* Lunch
* Snacks
* Iftar
* Event Dinner
* Optional Dinner

Breakfast is intentionally excluded due to lack of procurement impact.
