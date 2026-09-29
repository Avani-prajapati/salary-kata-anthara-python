# Task context: 001-employee-salary-management

> Generated for spec `3f1a2e9c-8b7d-4c6a-9e2f-7d5b6a1c4e80` at HEAD `35a303f06f79fb9db4d6e5754a09ce220fef86f7` · 2026-09-29T12:14:51Z
> Read first by every agent in /anthara:plan-implementer's slice loop.
>
> **Read [ARCHITECTURE.md](../../ARCHITECTURE.md) and [the spec](001-employee-salary-management-spec.md) first.** They are the two authoritative documents in this repo — there is no existing code to supersede or reconcile them against; this is a fully greenfield repository (only `kata.md`, `docs/requirements.md`, the spec, and `ARCHITECTURE.md` exist).

## 1. Affected modules

No `backend/` or `frontend/` source exists yet. Targets below are the module map from [ARCHITECTURE.md §4](../../ARCHITECTURE.md#4-module-map), confirmed against [spec §7.3](001-employee-salary-management-spec.md#73-module-decomposition) — not a walked codebase.

| Module / file (target, none exist yet) | Role | First slice to create it |
|---|---|---|
| `backend/app/core/` | DB session/engine, settings, shared error handling, reference data (Department/Country/Currency) | 5.1 |
| `backend/app/employees/{router,service,repository}.py` | Employee CRUD, search/filter, deactivation; owns the `Employee` model | 5.2, extended by 5.3–5.7 |
| `backend/app/analytics/{router,service,repository}.py` | Aggregate pay queries; reaches `employees` only via its service interface | 5.8 |
| `backend/app/scripts/seed.py` | Deterministic 10,000-employee seed | 5.1 |
| `frontend/src/features/employees/` | Directory, profile, add/edit/deactivate UI | 5.2, extended by 5.3–5.7 |
| `frontend/src/features/analytics/` | Analytics dashboard UI | 5.8 |
| `frontend/src/shared/` | App shell/nav, cross-feature UI, API client base | 5.2, reused by 5.8 |

## 2. Patterns to follow

Nothing exists to extract from; these are *mandated* by the architecture doc and must be established by the first slice that touches each layer, then held for every later slice:

- **Router → service → repository, dependency inward only** — service never imports FastAPI request/response types or the router module; repository never imports service. [ARCHITECTURE.md §3](../../ARCHITECTURE.md#3-dependency-rules), [spec §7.2](001-employee-salary-management-spec.md#72-architectural-style).
- **Fail-fast Pydantic validation at the router boundary** — service/repository trust already-validated input. [spec §6.2.1](001-employee-salary-management-spec.md#62-clean-code).
- **Domain-based folders**, never a project-wide `controllers/`/`services/`/`models/` split. [spec §6.1.1](001-employee-salary-management-spec.md#61-incubyte-engineering-standards).
- **`analytics` reaches `employees` only through its service's public interface** — never its repository or models directly. [ARCHITECTURE.md §3](../../ARCHITECTURE.md#3-dependency-rules).
- **Shared FastAPI exception handler → `{code, message}` JSON with correct HTTP status**, built once in `core`, reused for every 404/422. [ARCHITECTURE.md §5](../../ARCHITECTURE.md#5-cross-cutting-concerns).

Since these are first-instance patterns, the earliest slices establish convention rather than imitate one — see §4a for what to mirror slice-to-slice.

## 3. Reusable utilities

None exist yet. Anticipated shared utilities slice 5.1 must create, and every later slice must reuse rather than reinvent:

- DB session/engine + settings factory — `backend/app/core/` (created 5.1); every repository takes this session, never opens its own connection.
- Fixed Department/Country/Currency reference data + country→currency mapping — `backend/app/core/` (created 5.1); slices 5.3, 5.5, 5.6, 5.8 all read this one list — no second copy anywhere, per invariant 4.5.
- Shared `{code, message}` exception handler — `backend/app/core/` (created by 5.2/5.4, first 404 case); reused by 5.5–5.8.
- Frontend API client base + a single shared `QueryClient` — `frontend/src/shared/` (created 5.2); reused by every later feature slice.

## 4. Adjacent code that must coordinate (per slice)

- **Slice 5.1:** none downstream yet — first slice.
- **Slice 5.2:** `frontend/src/shared/` app shell/nav (Directory and Analytics tabs both mount here, per spec §5 Entry column); `backend/app/employees/router.py` registered into the FastAPI app.
- **Slice 5.3:** extends the listing query built in 5.2 — do not duplicate it.
- **Slice 5.4:** the directory row click handler from 5.2; profile route must be independently bookmarkable (AC 5.4.3).
- **Slice 5.5:** directory list cache (5.2) must invalidate/refetch on create.
- **Slice 5.6:** profile (5.4) and directory (5.2) must both reflect the edit — same cache-invalidation concern as 5.5.
- **Slice 5.7:** directory (5.2) and profile (5.4) status badges; analytics (5.8) default aggregates must exclude this employee.
- **Slice 5.8:** `employees` domain service (read-only) — never its repository/models directly.

## 4a. Slice imitation targets

- **Slice 5.1:** greenfield, no imitation target — first code in the repo.
- **Slice 5.2:** no prior router/service/repository exists — this slice sets the shape (arg order, projection, pagination contract) 5.3–5.7 must mirror.
- **Slice 5.3:** mirror 5.2's listing query — extend with filter params, do not write a parallel search endpoint.
- **Slice 5.4:** mirror 5.2's repository read pattern for a single-row lookup.
- **Slice 5.5:** mirror 5.2/5.4's error-mapping and session pattern, adapted for a write path.
- **Slice 5.6:** mirror 5.5's validation/error-mapping shape, adapted for a partial update.
- **Slice 5.7:** mirror 5.6's update-path shape (single-field status transition, same 404 handling as 5.4/5.6).
- **Slice 5.8:** `analytics` has no `employees`-domain precedent for its CRUD contract (different domain, read-only, aggregate SQL) — mirror only the router→service→repository *layering shape* from 5.2, not its contract.

## 4b. Slice lexicon

(pinned from [spec §3](001-employee-salary-management-spec.md#3-type-ontology) and [§7.3](001-employee-salary-management-spec.md#73-module-decomposition) — do not drift)

- **5.1:** entities=`Employee`, `Department`, `Country`, `Currency snapshot`; command=`python -m backend.scripts.seed`; flag=`--reset`.
- **5.2:** route=`GET /api/employees`; params=`page`, `pageSize`, a sort param (name TBD by slice-builder, hold consistent thereafter); fields=`name, department, country, title, salary, status`.
- **5.3:** params=`q`, `department`, `country`, `status`; semantics=AND across all.
- **5.4:** route=`GET /api/employees/{id}`; error body=`{code, message}`.
- **5.5:** route=`POST /api/employees`; event=`EmployeeCreated`; field=`salary_currency` (derived, never user-editable).
- **5.6:** route=`PATCH /api/employees/{id}`; event=`EmployeeUpdated`; paired fields=`country` → `salary_currency` (must update together).
- **5.7:** route=`POST /api/employees/{id}/deactivate`; event=`EmployeeDeactivated`; states=`Active`, `Inactive`.
- **5.8:** routes=`GET /api/analytics/by-department`, `GET /api/analytics/by-country`, `GET /api/analytics/pay-bands`; param=`includeInactive`; bands=`<40k, 40-70k, 70-100k, 100-150k, 150k+`.

## 4c. Slice traps

- **5.1:** (1) seed must be deterministic — same seed value ⇒ byte-identical data (AC 5.1.2). (2) refuse or require `--reset` on a non-empty DB, never silently duplicate (AC 5.1.5). (3) do NOT create a second country→currency mapping elsewhere (invariant 4.5).
- **5.2:** (1) do NOT return all 10,000 rows and paginate/sort client-side — server-side only (AC 5.2.1, 5.2.3). (2) key rows by employee `id`, never array index ([§6.4.1](001-employee-salary-management-spec.md#64-sonarjs-violations-frontend-typescript-scope-only--not-applicable-to-the-python-backend)).
- **5.3:** (1) filters must compose with 5.2's pagination/sort, not conflict (AC 5.3.3). (2) label every filter control via `<label for>`/`aria-label`, not placeholder-only (AC 5.3.5). (3) zero-match combination renders an explicit empty state, not a blank table (AC 5.3.4).
- **5.4:** (1) missing id returns 404 `{code, message}`, never 500 (AC 5.4.2). (2) profile must be reachable by direct URL, not only via in-app navigation state (AC 5.4.3).
- **5.5:** (1) `salary_currency` is derived from `country`, never free-text or independently editable (invariant 4.5, AC 5.5.5). (2) reject salary ≤ 0 before it reaches storage (invariant 4.2, AC 5.5.2). (3) validation errors list every invalid field, not just the first (AC 5.5.3). (4) `autocomplete` attributes on name/email/hire-date inputs (AC 5.5.6).
- **5.6:** (1) changing `country` must also update `salary_currency` in the same operation (invariant 4.5, AC 5.6.3). (2) reject negative salary, leave the stored record unchanged (AC 5.6.2). (3) invalidate the query cache — no stale profile after save (AC 5.6.5). (4) do NOT build a salary-history table in passing — deliberately deferred ([§9.1](001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)).
- **5.7:** (1) never hard-delete — status flips to `Inactive` only (invariant 4.3, AC 5.7.1). (2) a second deactivate call is idempotent: 200, no error, status stays `Inactive` (AC 5.7.3). (3) show a visible Inactive badge, never hide the distinction (AC 5.7.4). (4) do NOT silently include Inactive employees in default analytics (invariant 4.4).
- **5.8:** (1) one aggregate SQL query per endpoint — no N+1 per-employee computation (AC 5.8.6). (2) default to Active-only; only `includeInactive=true` recomputes over all (invariant 4.4, AC 5.8.4). (3) the include-inactive toggle's state is always visibly rendered next to the figures it affects (AC 5.8.5). (4) do NOT fetch a live FX rate — use the static seeded snapshot only ([§9.4](001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits), accepted limit). (5) do NOT add per-employee currency override handling — out of scope ([§9.2](001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)).

## 5. Known dragons

None — the repository is fully greenfield: no legacy code, no `TODO`/`FIXME`/`DEPRECATED` markers, no prior implementation carrying compliance debt or race conditions. The nearest equivalent is scope discipline: [spec §9](001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits) lists five deliberately deferred/accepted limitations (salary history, per-employee currency override, auth, live FX, CSV import/export, SQLite/offset-pagination ceiling) that a later maintainer may be tempted to "fix" in passing — see §4c for the ones adjacent to specific slices.

## 6. Test conventions

- Backend: pytest + FastAPI `TestClient`, in-process, no network/browser dependency. [spec §7.1](001-employee-salary-management-spec.md#71-tech-stack).
- Frontend: Vitest + React Testing Library. [spec §7.1](001-employee-salary-management-spec.md#71-tech-stack).
- No test files exist yet — the first slice establishes the co-location convention (or a mirrored `tests/` tree); hold it for every later slice.
- ZOMBIES coverage is mandatory per slice: Zero, One, Many (10k-seed / multi-filter), Boundaries (page beyond last, salary = 0), Interfaces (request/response contracts), Exceptions (404/422), Simple happy path. [spec §6.1.3](001-employee-salary-management-spec.md#61-incubyte-engineering-standards).
- Test names describe HR-observable behavior ("deactivating an employee excludes them from default analytics"), never implementation mechanics. [spec §6.1.4](001-employee-salary-management-spec.md#61-incubyte-engineering-standards).
- Seed determinism (AC 5.1.2) makes the 10k dataset itself a reusable fixture for "Many" cases across 5.2–5.8 — do not regenerate ad hoc smaller fixtures that could drift from the seeded distribution's invariants.

## 7. Hot paths and performance landmines

- `GET /api/employees` (5.2, 5.3) — ≤ 2s against the full 10k-row seeded dataset, one page per response; server-side sort/filter only, no in-memory sort of a fully loaded table (AC 5.2.1, 5.2.2).
- `GET /api/analytics/by-department|by-country|pay-bands` (5.8) — ≤ 2s via a single aggregate SQL query per endpoint; N+1 per-employee application-code computation is explicitly forbidden (AC 5.8.6).
- Offset pagination over SQLite is accepted only at the kata's fixed 10,000-row scale, not beyond ([§9.6](001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)) — do not take on pagination/DB redesign work under this spec.

## 8. Open uncertainties resolved during orientation

None outstanding. [Spec §8](001-employee-salary-management-spec.md#8-open-questions) already records 0 open questions. Orientation confirmed there is no pre-existing code, test suite, or convention to reconcile against — ARCHITECTURE.md and the spec are the sole authorities for every slice.

## 8a. Design system

- **Source of truth:** none detected — greenfield; no `design.md`, no tokens/theme file, no component library committed. Do not invent one. The mandated *component kit* (fixed by [spec §7.1](001-employee-salary-management-spec.md#71-tech-stack), not a design system to extract) is React 18 + TypeScript + **MUI v5** + MUI X DataGrid (Community) for the Directory table + MUI X Charts (Community) for the pay-band distribution. Build from these primitives (`Button`, `TextField`, `DataGrid`, `Chart`, etc.) rather than hand-rolling equivalents; there is no custom token/theme layer yet to imitate.
- **Conventions in force (spec-mandated, not codebase-derived):** WCAG AA floor per [§6.3](001-employee-salary-management-spec.md#63-accessibility-checklist-wcag-aa-floor) — reflow to one column at 320px/400% zoom with no horizontal scroll (AC 5.2.5), programmatically labeled controls (AC 5.3.5), `autocomplete` on identity fields (AC 5.5.6). SonarJS frontend rules per [§6.4](001-employee-salary-management-spec.md#64-sonarjs-violations-frontend-typescript-scope-only--not-applicable-to-the-python-backend): stable list keys by employee `id`, every component's props typed `Readonly<Props>`.
- **Per-slice UI note:** 5.2–5.8 are all first-instance UI. Slice 5.2 establishes the app shell/nav and Directory screen that 5.3–5.7 extend; 5.8 sits alongside as a new tab. No earlier screen exists to imitate for any of them.

---
## Changelog
- 2026-09-29 — generated by code-orienteer from spec `3f1a2e9c-8b7d-4c6a-9e2f-7d5b6a1c4e80` at HEAD `35a303f`.
