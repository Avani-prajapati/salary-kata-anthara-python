# ACME Employee Salary Management

A web application replacing ACME HR's spreadsheets: browse/search/add/edit/deactivate 10,000 employees across multiple countries, and answer "how does the org pay people?" via org-wide pay analytics.

Built as a take-home technical assessment for a Python-role application. See [`docs/requirements.md`](docs/requirements.md) for the one-page requirements doc, [`docs/specs/001-employee-salary-management-spec.md`](docs/specs/001-employee-salary-management-spec.md) for the full spec, [`docs/plans/001-employee-salary-management-plan.md`](docs/plans/001-employee-salary-management-plan.md) for the execution plan, and [`ARCHITECTURE.md`](ARCHITECTURE.md) for the architecture reference.

## Stack

- **Backend:** Python 3.13, FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite, pytest.
- **Frontend:** React 18, TypeScript, Vite, MUI v5 + MUI X DataGrid/Charts, TanStack Query, react-hook-form, Vitest + React Testing Library + MSW.
- **Architecture:** modular monolith, domain-based modules (`employees`, `analytics`), each layered router → service → repository.

## Running it

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# seed the database (10,000 employees, deterministic with --seed)
python -m app.scripts.seed --count 10000 --seed 42

# run the API
uvicorn app.main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs` (FastAPI auto-generated OpenAPI UI).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App at `http://localhost:5173`. Expects the backend at `http://localhost:8000` (see `frontend/src/shared/api/client.ts`).

### Tests

```bash
# backend
cd backend && source .venv/bin/activate && python -m pytest -q      # 48 tests

# frontend
cd frontend && npx vitest run                                        # 22 tests
```

## What's built

Eight vertical slices, in the order they were built (see the plan and spec for full detail):

1. Seed script — deterministic 10,000-employee dataset generator.
2. Employee directory — paginated, server-sorted table.
3. Search and filter the directory (name/email fragment, department, country, status).
4. Employee profile view.
5. Add a new employee (currency auto-derived from country, never client-settable).
6. Edit an employee's details and salary (re-derives currency on country change; overwrites in place, no history table).
7. Deactivate an employee (soft delete — idempotent, never removes the row).
8. Org-wide pay analytics — headcount and avg/median/min/max salary by department and country, plus a pay-band distribution chart, with a snapshot FX conversion for cross-currency comparison.

## Deliberately out of scope

Authentication/RBAC, salary-history/raise-over-time tracking, payroll/tax/benefits, live FX-rate integration, per-employee currency overrides, and CSV/Excel import/export beyond the seed script. Each has stated reasoning in [`docs/requirements.md`](docs/requirements.md) and spec [§9](docs/specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits).

## Trade-offs and key decisions

- **Department/Country are static in-code reference data, not database tables.** They're small (~9/~10 entries) and never edited by the single HR Manager persona this kata scopes to — a real table + admin UI would be speculative generality. Documented in the plan's Decision 1.
- **Currency is always server-derived from country, never client-settable.** `EmployeeCreate`/`EmployeeUpdate` have no `salary_currency` field at all — this makes the "one currency per country" invariant impossible to violate through the API, not merely validated (plan Decision 2).
- **Analytics computes median in Python, not SQL.** SQLite has no portable `MEDIAN()`; fetching grouped rows once and computing avg/median/min/max via `statistics` in one shared helper avoids two divergent code paths (plan Decision 3). This is still one query per view, not N+1.
- **Cross-currency comparisons use a static, seed-time FX snapshot**, not a live rate API — keeps the system dependency-free and tests deterministic. The snapshot date is stored alongside each rate so the approximation is visible.
- **No Alembic migrations.** Schema is created via `Base.metadata.create_all` at seed/startup time — appropriate for a single-environment kata; a real deployment would introduce proper migrations.
- **Analytics reads employee data only through `EmployeeService`'s public interface**, never the `employees` domain's repository or table directly — this was actually a mid-build correction: the initial implementation queried the shared table directly for a (marginal) simplicity gain, an end-of-build review caught that it violated the project's own cross-domain rule (and had already caused a duplicated status-literal as evidence of drift), and it was refactored before considering the build complete. See the plan's `## Escalation log` for the full record.
- **The Directory screen renders a responsive card list below ~600px** instead of forcing the data grid to reflow — a data-dense sortable table doesn't meaningfully "reflow" to one column, so a genuinely different, single-column layout was built for narrow viewports rather than just scoping a horizontal scrollbar to the grid.

## Performance considerations

- Directory listing and analytics endpoints are both benchmarked against the full 10,000-row seeded dataset (not a small fixture): directory pagination responds in ~15–40ms, analytics aggregates in well under the 2-second target — both driven by indexed offset pagination and single grouped queries rather than N+1 per-row work.
- The seed script bulk-inserts (one `add_all` + one `commit`) rather than committing per row — generating and inserting 10,000 employees takes ~1.3 seconds.
- SQLite and offset pagination are accepted as sufficient at exactly 10,000 rows (the kata's stated scale); scaling meaningfully beyond that, or adding concurrent multi-user writes, would warrant revisiting both choices.

## AI tooling and process

Built end-to-end using Claude Code (Claude Sonnet 5 / Opus 5, via the Anthara plugin's spec → plan → build → review chain):

1. **Spec-writer** — turned the kata brief into a slice-decomposed spec (`docs/specs/001-employee-salary-management-spec.md`) with named invariants, an architecture decision, and explicit deferred-scope reasoning. A handful of scoping decisions (tech stack, analytics scope, currency handling) were confirmed via a single batch of recommended-default questions rather than an extended interview, since this is a solo assessment.
2. **Planner** — authored a detailed per-slice execution plan (`docs/plans/001-employee-salary-management-plan.md`) on the strongest available model tier, including a code-orienteer pass, module structure, control-flow outlines, test strategy, and a per-slice build-agent tier assignment (harder slices — the seed generator, add/edit validation, the analytics dual-currency logic — ran on a stronger tier than the mechanical CRUD slices).
3. **Plan-implementer** — built each of the 8 slices as a separate agent run at its assigned tier, code-then-tests, committing per slice.
4. **End-of-spec review** — a single always-on reviewer plus one reviewer per active compliance/quality pack (Clean Code, Incubyte Engineering Standards, Accessibility/WCAG, SonarJS-frontend) ran in parallel over the full diff. This caught 3 real HIGH-severity issues — an analytics-to-employees cross-domain architecture violation (this session's own plan had briefly sanctioned it, then caught its own mistake), a Directory screen that didn't genuinely reflow at narrow viewports, and mouse-only row navigation — plus a set of smaller polish items (DRY extractions, accessible names, test-naming conventions). All HIGHs were fixed and re-verified by the same reviewers before considering the build done.

The full commit history is the record of this process — one feature commit per slice, plus separate commits for the plan correction and the review-fix pass.
