### Meal Headcount Planner (MHP)

Meal Headcount Planner (MHP) is an internal web application designed to replace the existing Excel-based process for collecting and calculating daily meal headcounts for employees.

The goal of the project is to provide a **correct, auditable, and role-aware system** for daily meal planning, while keeping the first iteration intentionally simple and easy to extend.

---

#### Iteration 1 Scope

Iteration 1 focuses on:

* Daily meal participation (default opt-in, explicit opt-out)
* Role-based access (Employee, Team Lead, Admin, Logistics)
* Team-based authorization for Team Leads
* Aggregated headcount visibility for Logistics/Admin
* File-based JSON storage
* Local execution

The following are explicitly **out of scope** for Iteration 1:

* Notifications
* Historical reporting
* Meal cutoff enforcement
* Holiday / calendar automation
* External authentication or SSO

---

#### Tech Stack

* **Backend:** Node.js, Express
* **Authentication:** Session-based
* **Storage:** File-based JSON
* **UI (Iteration 1):** Server-rendered views

A separate frontend (e.g. React) may be introduced in later iterations without backend refactoring.

---

#### Project Structure

```
mhp/
 ├─ backend/
 ├─ docs/
 └─ README.md
```

Detailed architecture and design decisions are documented in
[docs/technical-design.md](docs/technical-design.md).

---

#### Status

This repository currently contains:

* Project bootstrap
* Authoritative technical design for Iteration 1

Implementation will follow the approved design.
