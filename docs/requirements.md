# Requirements — ACME Employee Salary Management

**Goal.** Give ACME's HR Manager a single web application to manage the salary data of 10,000 employees across multiple countries — replacing spreadsheets — and to answer questions about how the org pays people, not just to store records.

## Scope & features (v1)

| Feature | Why it's in |
|---|---|
| Employee directory — browse, search, filter (by name, department, country, status) 10,000 employees with pagination | Core replacement for the spreadsheet; must stay fast at 10k rows |
| Employee profile — view full details for one employee | Needed to inspect/verify a single record before editing |
| Add employee | HR must be able to onboard new hires without touching a spreadsheet |
| Edit employee details & salary | HR must be able to correct data and record raises/adjustments |
| Deactivate employee (soft delete) | Employees leave; their salary history must be preserved for aggregate accuracy, not hard-deleted |
| Org-wide pay analytics — headcount, avg/median/min/max salary by department and by country, pay-band distribution | Directly answers "how do we pay people" — the stated business problem, not just CRUD |
| Seed script generating 10,000 realistic, deterministic employees across ~10 countries and ~9 departments | Required to develop/test/demo against a realistic dataset |

## Deliberately out of scope (v1)

| Excluded | Reasoning |
|---|---|
| Authentication / authorization / roles | The problem statement scopes one persona (HR Manager) with no mention of other actors; building login/RBAC would spend assessment time on a solved problem instead of the core salary-management and analytics logic. Single implicit user is an accepted, stated limitation. |
| Salary history / raise-over-time tracking | Only the current salary snapshot is modeled. Historical trend analysis needs a versioned salary-history table — a real but separable feature, deferred rather than half-built. |
| Payroll processing, tax withholding, benefits, time-off, performance reviews | These are distinct, heavily regulated domains in their own right. The kata's problem statement is salary *data management*, not payroll execution. |
| Live FX-rate integration | Cross-country USD comparisons use a static seeded snapshot rate instead of a live external API, to keep the system dependency-free and tests deterministic. Documented as an accepted approximation. |
| Per-employee currency override (e.g. expatriates paid off-country) | Modeled as one currency per country. A real edge case, but adding it would meaningfully expand the data model and UI for a case the assignment doesn't ask about. |
| CSV/Excel import or export (beyond the seed script) | A reasonable stretch feature, but not required to answer the stated problem; noted as a natural next slice. |
| Multi-tenant / multi-organization support | ACME is the only org in scope. |

## Approach

Python (FastAPI) + SQLAlchemy + SQLite backend; React + TypeScript + MUI frontend; domain-based modular-monolith architecture (`employees`, `analytics` domains, each layered router → service → repository). Full reasoning, architecture, invariants, and slice-by-slice acceptance criteria are in [`docs/specs/001-employee-salary-management-spec.md`](specs/001-employee-salary-management-spec.md).
