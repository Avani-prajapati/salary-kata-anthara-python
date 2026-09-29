# Plan: 001-employee-salary-management

> Spec: `docs/specs/001-employee-salary-management-spec.md` · Context: `docs/specs/001-employee-salary-management-context.md` · Authored: 2026-09-29
> Risk: MODERATE (sensitive salary PII, user-facing, no auth/payment/migration surface touched) · Hard floors: none · Fabric standards: reachable

---

# Part 1 — Review this

*Everything a reviewer needs to approve or redirect the approach. If you only read one part, read this one.*

## What we're doing

Building the ACME employee salary management system exactly as [the spec](../specs/001-employee-salary-management-spec.md) slices it: a FastAPI + SQLAlchemy + SQLite backend and a React + TypeScript + MUI frontend, organized as two domain modules (`employees`, `analytics`) each internally layered router → service → repository, per [ARCHITECTURE.md](../../ARCHITECTURE.md).

The core approach-forcing constraint is **SQLite has no built-in median function**, and the spec commits to reporting median salary per department and per country ([spec §5.8](../specs/001-employee-salary-management-spec.md#58-view-org-wide-pay-analytics)). That forces analytics aggregation to fetch grouped raw rows in one query per view and compute avg/median/min/max in Python (`statistics` module) rather than in pure SQL — see [Decision 3](#decisions-made).

One deliberate exception to "everything through the domain layers": Department and Country are **not** database tables. They're small, fixed, non-user-editable reference lists (the spec never asks HR to manage departments or countries), so they live as in-code constants validated at the API boundary — see [Decision 1](#decisions-made). This is named here, up front, because a reviewer scanning for a `departments` table won't find one and should not read that as a gap.

## How it breaks down

The spec's slice order is a dependency order and this plan preserves it exactly: the seed slice establishes the schema and reference data every later slice needs; the directory slice establishes the API/UI seam that search, profile, add, edit, and deactivate all extend; analytics is last because it reads data the other seven slices produce and mutate.

| # | Slice | Delivers | Why this tier | Tier |
|---|-------|----------|---------------|------|
| 1 | Seed the organisation's employee data | Schema, reference data, deterministic 10k-employee generator | Data-generation determinism and realistic distribution logic is the trickiest part of an otherwise mechanical slice | `excellent` |
| 2 | Browse the employee directory | Paginated/sortable server-driven table, first UI screen | Standard CRUD-list pattern, but establishes the API/UI seam every later slice reuses | `excellent` |
| 3 | Search and filter the directory | Query-param search/filter over slice 2's endpoint | Mechanical extension of an established seam | `fast` |
| 4 | View an employee's full profile | Detail screen, `GET /{id}` | Simple, obvious CRUD-passthrough shape | `fast` |
| 5 | Add a new employee | Form + validated `POST`, currency auto-set from country | Validation rules and the country→currency invariant need care | `excellent` |
| 6 | Edit an employee's details and salary | Partial `PATCH`, re-derives currency on country change | Same invariant as slice 5, plus partial-update semantics | `excellent` |
| 7 | Deactivate an employee | Idempotent soft-delete state transition | Simple, obvious state transition | `fast` |
| 8 | View org-wide pay analytics | Department/country aggregates, pay-band distribution | Median-without-SQL, dual-currency conditional logic, and the FX-snapshot conversion are the hardest reasoning in the whole plan | `best` |

Slices 3, 4, and 7 are near-identical in shape to slice 2's established pattern (repository method → service method → router endpoint → a thin screen or a screen addition) — they extend rather than invent, which is why they're priced at `fast`. Slices 5 and 6 share the country→currency re-derivation logic; slice 6 reuses slice 5's validation helper rather than duplicating it (see [Decision 2](#decisions-made)).

## Decisions made

**1. Department and Country are static in-code reference data, not database tables.** They are small (~9 and ~10 entries), fixed for the life of this assessment, and never edited by the HR Manager persona the spec scopes to. Modeling them as tables would need seed rows, foreign keys, and (eventually) admin CRUD for data that never changes — speculative generality the spec doesn't ask for. Employees reference them by a string id validated against the constant list at the API boundary. Lands in slice 1 (`core/reference_data.py`) and is read by every later slice. *Rejected: `departments`/`countries` tables with foreign keys — adds migration and admin-UI surface for data with no editing requirement in scope.*

**2. Currency is always server-derived from country, never client-settable.** `EmployeeCreate` and `EmployeeUpdate` schemas have no `salary_currency` field at all — the service layer resolves it from `country_id` via the slice 1 reference data on every create and on any country change. This makes [invariant 4.5](../specs/001-employee-salary-management-spec.md#4-invariants) impossible to violate through the API rather than merely validated. Lands in slices 5 and 6, which share one `resolve_currency(country_id)` helper. *Rejected: accepting `salary_currency` as a client-supplied field with a cross-check — strictly weaker, since it leaves a window where client and server disagree before validation runs.*

**3. Analytics aggregates fetch grouped raw rows in one query per view, then compute avg/median/min/max in Python.** SQLite has no portable `MEDIAN()`, and computing avg/min/max in SQL while median in Python would mean two different code paths producing figures that could drift in edge cases (e.g. rounding). One fetch, one computation path, using the standard library's `statistics.median`/`mean`. At 10,000 rows this comfortably meets the slice's 2-second target (AC 5.8.6) — this is one query per endpoint, not N+1 per-employee queries, which is the constraint AC 5.8.6 actually guards against. Lands entirely in slice 8. *Rejected: SQLite window-function accumulator for median — meaningfully more SQL complexity for a dataset size where the simpler approach is already fast enough.*

**4. Backend tests use a fresh in-memory SQLite database per test function, not a shared file-based one.** Guarantees test independence and determinism (test-craft) without any teardown risk of leaking rows between tests. Lands in `backend/tests/conftest.py`, used by every backend slice's tests. *Rejected: one shared SQLite file reset between tests — slower, and a forgotten reset step becomes a flaky-test source.*

**5. Frontend tests mock the network boundary (MSW), not the API client module.** Components exercise the real `fetch` call path through TanStack Query exactly as they do in production; only the HTTP response is faked. This is the state-over-interaction test-craft principle applied to the browser: assert on rendered output after a faked server response, not on which internal function was called. Lands in `frontend/src/test-setup` shared across every UI slice. *Rejected: mocking `features/*/api.ts` hooks directly — couples tests to the hook's internal call shape and stops catching integration breaks between the component and TanStack Query.*

## Where this could go wrong

- **Median/dual-currency logic in slice 8 is the highest-risk code in the plan** — a department spanning multiple currencies must report `currency: "USD"` and converted figures, while a single-currency department reports its native currency unconverted; getting the branch backwards silently produces plausible-looking wrong numbers. Guarded by slice 8's quality checks and a dedicated mixed-currency test case.
- **Country→currency drift between create and update paths** — if slice 6 re-implements currency resolution instead of reusing slice 5's helper, the two paths could disagree after a future change. Guarded by slice 6's Structure explicitly reusing `resolve_currency` rather than redefining it.
- **10,000-row seed performance** — a naive one-`INSERT`-per-employee loop could make slice 1 slow enough to make local development annoying (not an AC violation, but a real friction risk). Guarded by slice 1's quality checks requiring bulk insert.
- **Scope creep into [spec §9.1](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits) (salary history)** — slice 6 (edit/record a raise) is the slice most tempting to "just add" a history row to, since the UI language talks about recording raises. It must overwrite the current salary, not append a history table. Guarded by slice 6's quality checks.
- **Scope creep into [spec §9.2](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits) (per-employee currency override)** — slice 5's Add form must not expose currency as an editable field, even though it's a "natural" field to add to a form. Guarded by slice 5's quality checks and Decision 2 above.

## What's out of scope

Everything in [spec §1's "Deliberately out of scope"](../specs/001-employee-salary-management-spec.md#1-overview--business-context) and [spec §9](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits) stays out: no authentication/RBAC ([§9.3](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)), no salary-history/raise-over-time tracking ([§9.1](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)), no live FX integration ([§9.4](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)), no per-employee currency override ([§9.2](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)), no CSV/Excel import/export beyond the seed script ([§9.5](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)), and no Alembic migrations — schema is created via `Base.metadata.create_all` at seed/startup time, an accepted limitation for a single-environment kata. A reviewer should read a missing `departments` table (Decision 1) and a missing salary-history table (§9.1) as intentional, not incomplete.

Top-level project documentation (a root `README.md` covering setup/run instructions, AI-tool usage notes, trade-offs, and performance considerations, per the kata's "Docs" ask) is written once, after all eight slices land — it is not itself a slice, since it has no user-observable behavior and no AC to satisfy.

---

# Part 2 — Build detail

*Prescriptive detail for the build agent. Reviewers can skim or skip.*

**Confidence markers used below:** `[verified]` = read the framework's stable, documented API shape and confirmed it against the installed version (FastAPI 0.124, Python 3.13 in this environment). `[inferred]` = the well-established, version-stable convention for this library, pattern-matched rather than freshly fetched from docs this session — the build agent should sanity-check against the installed package's actual type stubs/exports before assuming, particularly for `@mui/x-data-grid` prop names, which do shift across major versions.

## Shared conventions (all slices)

- **Architecture:** modular monolith; two domain modules, `employees` and `analytics`, each internally layered `router → service → repository → models`. `service` never imports FastAPI request/response types or the `router` module; `repository` never imports `service`. `analytics` depends on `employees` only through `employees.service`'s public functions, never its repository or models directly (per [ARCHITECTURE.md §3](../../ARCHITECTURE.md)).
- **Dependency direction:** router depends on service; service depends on repository; repository depends on SQLAlchemy models; nothing depends outward. Frontend: `features/<domain>/` depends on `shared/`; no feature imports another feature's internals.
- **Module map** (all paths new — greenfield):
  - `backend/app/core/` — `config.py` (Settings), `db.py` (engine, session, `get_db`, `init_db`), `errors.py` (typed exceptions + FastAPI exception handlers), `reference_data.py` (Department/Country/Currency/PayBand constants, `to_usd()`) — depended on by both domains, depends on nothing in-app.
  - `backend/app/employees/` — `models.py`, `schemas.py`, `repository.py`, `service.py`, `router.py` — depends on `core` only.
  - `backend/app/analytics/` — `schemas.py`, `repository.py`, `service.py`, `router.py` — depends on `core` and `employees.service` (public functions only, per architecture).
  - `backend/app/scripts/seed.py` — depends on `core` and `employees` models/repository.
  - `backend/app/main.py` — depends on both domains' routers and `core`; wires the app.
  - `frontend/src/shared/` — `api/client.ts` (typed fetch wrapper), `ui/AppShell.tsx` (nav shell), `ui/StatusBadge.tsx` — depended on by both features.
  - `frontend/src/features/employees/` — `api.ts` (TanStack Query hooks), `types.ts`, `DirectoryPage.tsx`, `FilterBar.tsx`, `ProfilePage.tsx`, `EmployeeForm.tsx`, `AddEmployeePage.tsx`, `EditEmployeePage.tsx`.
  - `frontend/src/features/analytics/` — `api.ts`, `types.ts`, `AnalyticsPage.tsx`, `DepartmentTable.tsx`, `CountryTable.tsx`, `PayBandChart.tsx`.
- **Lexicon (do not rename):** `Employee`, `EmployeeStatus` (`active`/`inactive`), `Department`, `Country`, `CurrencyRate`, `PayBand` — from the spec's [§3 type ontology](../specs/001-employee-salary-management-spec.md#3-type-ontology). `employees` / `analytics` as the two domain module names — from [ARCHITECTURE.md §4](../../ARCHITECTURE.md). `resolve_currency` as the name of the shared country→currency helper (Decision 2). `to_usd` as the name of the shared FX-conversion helper (Decision 3).
- **Tests:** backend — pytest + FastAPI `TestClient`, one fresh in-memory SQLite per test function via a `conftest.py` fixture that overrides `get_db` (Decision 4); every test file is new (`backend/tests/` doesn't exist yet). Frontend — Vitest + React Testing Library + MSW for network mocking (Decision 5); every test file is new (`frontend/src/**/__tests__/` doesn't exist yet). Test names describe HR-observable behavior, never AC/slice IDs, per [test-craft](../../../.anthara-plugin/skills/test-craft/SKILL.md) and the Incubyte business-language standard ([spec §6.1.4](../specs/001-employee-salary-management-spec.md#61-incubyte-engineering-standards)). Every slice's test list is walked against ZOMBIES (Zero/One/Many/Boundaries/Interfaces/Exceptions/Simple) before it's considered done ([spec §6.1.3](../specs/001-employee-salary-management-spec.md#61-incubyte-engineering-standards)).

---

## Slice 1 — Seed the organisation's employee data

**Key decision:** Establishes the schema, the in-code reference data (Decision 1), and a deterministic generator so every later slice has 10,000 realistic employees to build and test against. The generator uses a locally-seeded RNG (not global `random` state) so repeated runs with the same seed value are byte-identical, satisfying AC 5.1.2.

**Structure**

- `backend/app/core/reference_data.py` (new) — `@dataclass(frozen=True) class Department: id: str; name: str`; `@dataclass(frozen=True) class Country: id: str; name: str; currency_code: str`; `@dataclass(frozen=True) class CurrencyRate: code: str; usd_rate: Decimal; snapshot_date: date`; `@dataclass(frozen=True) class PayBand: label: str; min_usd: Decimal; max_usd: Decimal | None`; module-level constants `DEPARTMENTS: tuple[Department, ...]` (9 entries: Engineering, Sales, Marketing, Finance, HR, Operations, Customer Support, Legal, Product), `COUNTRIES: tuple[Country, ...]` (10 entries spanning USD/GBP/EUR/INR/CAD/AUD/SGD/BRL/JPY, with Germany and France both mapping to EUR — the invariant-4.5 "shared currency" case), `CURRENCY_RATES: dict[str, CurrencyRate]` (one entry per distinct currency code used above, snapshot dated 2026-09-29), `PAY_BANDS: tuple[PayBand, ...]` (5 USD-normalized bands); `def department_by_id(department_id: str) -> Department` (raises `InvalidReferenceError` on miss); `def country_by_id(country_id: str) -> Country` (raises `InvalidReferenceError` on miss); `def to_usd(amount: Decimal, currency_code: str) -> Decimal`.
- `backend/app/core/errors.py` (new) — `class AppError(Exception): pass`; `class NotFoundError(AppError): pass`; `class InvalidReferenceError(AppError): pass`; `def register_exception_handlers(app: FastAPI) -> None` registering handlers that map `NotFoundError` → 404 `{code: "not_found", message}` and `InvalidReferenceError` → 422 `{code: "invalid_reference", message}` `[verified: FastAPI's `@app.exception_handler(ExcType)` decorator is the documented mechanism for custom exception→response mapping]`.
- `backend/app/core/config.py` (new) — `class Settings(BaseSettings): database_url: str = "sqlite:///./salary.db"; model_config = SettingsConfigDict(env_prefix="APP_")` `[verified: pydantic-settings BaseSettings is the FastAPI-recommended settings pattern]`; module-level `settings = Settings()`.
- `backend/app/core/db.py` (new) — `engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})`; `SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)`; `class Base(DeclarativeBase): pass` `[verified: SQLAlchemy 2.0 declarative style]`; `def get_db() -> Generator[Session, None, None]` (yields, closes in `finally`); `def init_db() -> None` (calls `Base.metadata.create_all(bind=engine)`).
- `backend/app/employees/models.py` (new) — `class EmployeeStatus(str, Enum): ACTIVE = "active"; INACTIVE = "inactive"`; `class Employee(Base): __tablename__ = "employees"` with `Mapped` columns: `id: Mapped[int]` (primary key, autoincrement), `first_name: Mapped[str]`, `last_name: Mapped[str]`, `email: Mapped[str]` (unique index), `job_title: Mapped[str]`, `department_id: Mapped[str]` (indexed), `country_id: Mapped[str]` (indexed), `salary_amount: Mapped[Decimal]` (`Numeric(12, 2)`), `salary_currency: Mapped[str]`, `hire_date: Mapped[date]`, `status: Mapped[EmployeeStatus]` (indexed, default `ACTIVE`), `created_at: Mapped[datetime]` (server default now), `updated_at: Mapped[datetime]` (server default now, `onupdate` now) `[verified: SQLAlchemy 2.0 `Mapped[T]` / `mapped_column` declarative style]`.
- `backend/app/employees/repository.py` (new, only the methods this slice needs) — `class EmployeeRepository: def __init__(self, db: Session) -> None`; `def bulk_insert(self, employees: list[Employee]) -> None` (uses `db.add_all` + one `db.commit()`, not a commit per row); `def count_all(self) -> int`.
- `backend/app/scripts/seed.py` (new) — `def generate_employees(count: int, seed: int) -> list[Employee]`; `def main(argv: list[str] | None = None) -> int` — `argparse` with `--count` (default 10000), `--seed` (default 42), `--reset` (flag); prints a per-country headcount summary; returns a process exit code (1 when refusing a non-empty DB without `--reset`, 0 otherwise).

**Collaborators:** `seed.main` constructs `SessionLocal()`, `EmployeeRepository`, and calls `generate_employees`; `generate_employees` constructs its own `random.Random(seed)` and a `Faker` instance seeded via `Faker.seed(seed)` `[inferred: Faker's global `Faker.seed()` plus a per-call `random.Random` are both needed since Faker's internal RNG is separate from stdlib `random` — the build agent should confirm the exact seeding call against the installed `faker` package's README, since this repo does not have it installed yet]`; the router (slice 2+) constructs `EmployeeService(EmployeeRepository(db))` per request via `Depends`.

**Control flow:**
- `generate_employees`: for each of `count` employees — pick a country via `rng.choices(COUNTRIES, weights=...)`, pick a department similarly, derive `salary_currency` from the chosen country, compute `salary_amount` from a per-department base × per-country cost-of-living multiplier × a jitter factor drawn from `rng`, generate name/email/job title/hire date via the seeded `Faker` instance, default `status=ACTIVE`.
- `seed.main`: parse args → `init_db()` → if `not reset and repository.count_all() > 0`: print refusal message, return 1 → if `reset`: drop and recreate all tables → generate employees → `repository.bulk_insert(...)` → print summary → return 0.

**Tests:** new `backend/tests/test_seed.py`. Cases (ZOMBIES): seeding an empty database creates exactly 10,000 employees (One→Many, AC 5.1.1); running the seed command twice with the same seed produces identical generated field values (Interfaces/determinism, AC 5.1.2); every generated employee has a department/country/currency combination valid per the reference data, with at least one department represented across employees in more than one currency to prove the fixture supports slice 8's dual-currency case (Boundaries, AC 5.1.3); every generated salary is strictly positive (Boundaries, AC 5.1.4); running seed again without `--reset` against a non-empty database exits non-zero and adds no rows (Exceptions, AC 5.1.5); running with `--count 1` produces exactly one employee (Zero/One edge for the generator itself, not an AC but a ZOMBIES-required boundary case).

**Standards that bite here:** Clean Code fail-fast (reference-data lookups raise on an unknown id rather than silently defaulting); Incubyte "no dead code"; Incubyte ZOMBIES test design (spec §6.1.3).

**Quality checks**

- Reference data has exactly one entry per department/country id used anywhere, and at least two countries share a currency code (needed for slice 8's dual-currency test case to have real data).
- **Seeding uses one bulk operation, not a commit-per-row loop** — the highest-risk assertion for this slice, since a per-row commit loop would make every later slice's local dev loop noticeably slower without failing any test.
- No global mutable RNG state — `generate_employees` takes its seed as a parameter and constructs its own RNG rather than reseeding `random` globally (Clean Code: no hidden shared mutable state).
- No Alembic or migration files created — schema exists only via `Base.metadata.create_all`, consistent with the plan's accepted limitation.

**Verification (slice complete when these pass)**

1. **Tests.** Run the full test suite — all tests green.
2. **Migrations.** Not applicable — this slice defines the initial schema via `metadata.create_all`, not a migration tool; running the seed command against a fresh database file succeeds without error, which is this slice's equivalent check.

---

## Slice 2 — Browse the employee directory

**Key decision:** Establishes the API/UI seam every later employee-facing slice extends: a paginated, server-sorted `GET /api/employees` and a `DirectoryPage` built on MUI X DataGrid in server mode. Pagination and sorting are server-side from the start (not client-side over a full fetch), because the spec requires sub-2-second response over 10,000 rows (AC 5.2.2) and DataGrid's server mode is built for exactly this shape.

**Structure**

- `backend/app/employees/schemas.py` (new) — `class EmployeeRead(BaseModel): id: int; first_name: str; last_name: str; email: str; job_title: str; department_id: str; country_id: str; salary_amount: Decimal; salary_currency: str; hire_date: date; status: EmployeeStatus; model_config = ConfigDict(from_attributes=True)` `[verified: Pydantic v2 `from_attributes` is the documented ORM-to-schema mode]`; `class Page(BaseModel, Generic[T]): items: list[T]; total: int; page: int; page_size: int` `[inferred: Pydantic v2 supports `Generic[T]` models; the build agent should confirm generic-model syntax against the installed pydantic version]`.
- `backend/app/employees/repository.py` (modify — add to slice 1's methods) — `def list(self, *, page: int, page_size: int, sort_by: str, sort_dir: str) -> tuple[list[Employee], int]` (returns the page's rows and the total matching count via a separate `COUNT(*)` query).
- `backend/app/employees/service.py` (new) — `ALLOWED_SORT_COLUMNS: frozenset[str]` (an explicit allow-list: `last_name`, `department_id`, `country_id`, `salary_amount`, `hire_date`); `class EmployeeService: def __init__(self, repository: EmployeeRepository) -> None`; `def list_employees(self, *, page: int, page_size: int, sort_by: str, sort_dir: str) -> tuple[list[Employee], int]` (raises `InvalidReferenceError` if `sort_by` not in the allow-list — this is the fail-fast guard against building a SQL `ORDER BY` from unvalidated input).
- `backend/app/employees/router.py` (new) — `router = APIRouter(prefix="/api/employees", tags=["employees"])`; `def get_db_session() -> ...` reused from `core.db.get_db`; `@router.get("", response_model=Page[EmployeeRead]) def list_employees(page: int = 1, page_size: int = 50, sort_by: str = "last_name", sort_dir: Literal["asc", "desc"] = "asc", db: Session = Depends(get_db)) -> Page[EmployeeRead]`.
- `backend/app/main.py` (new) — constructs `app = FastAPI()`; `app.add_middleware(CORSMiddleware, allow_origins=[<vite dev origin>], allow_methods=["*"], allow_headers=["*"])` `[verified: FastAPI's documented CORS middleware]`; `register_exception_handlers(app)`; `app.include_router(employees.router)`; startup hook calling `init_db()`.
- `frontend/src/shared/api/client.ts` (new) — `async function apiGet<T>(path: string, params?: Record<string, string | number>): Promise<T>` (typed fetch wrapper, throws a typed `ApiError` on non-2xx).
- `frontend/src/features/employees/types.ts` (new) — `interface Employee { id: number; firstName: string; lastName: string; email: string; jobTitle: string; departmentId: string; countryId: string; salaryAmount: string; salaryCurrency: string; hireDate: string; status: "active" | "inactive" }` (camelCase on the wire boundary — the API client maps snake_case JSON to this shape); `interface Page<T> { items: T[]; total: number; page: number; pageSize: number }`.
- `frontend/src/features/employees/api.ts` (new) — `function useEmployeesQuery(params: { page: number; pageSize: number; sortBy: string; sortDir: "asc" | "desc" }): UseQueryResult<Page<Employee>>` via TanStack Query's `useQuery` `[inferred: TanStack Query v5 `useQuery({queryKey, queryFn})` shape — the build agent should confirm the exact hook signature against the installed `@tanstack/react-query` major version]`.
- `frontend/src/features/employees/DirectoryPage.tsx` (new) — `Readonly<{}>` props (top-level route page, no props); renders `AppShell` + MUI X `DataGrid` with `paginationMode="server"`, `sortingMode="server"`, `rowCount={data.total}`, `getRowId={(row) => row.id}` `[inferred: MUI X DataGrid server-mode prop names — verify against the installed `@mui/x-data-grid` version's types, since these have shifted across major versions]`.
- `frontend/src/shared/ui/AppShell.tsx` (new) — `Readonly<{ children: ReactNode }>` — top nav with Directory/Analytics tabs (both routes exist as of this slice's frontend routing setup, even though Analytics' content lands in slice 8).

**Collaborators:** `router.list_employees` constructs `EmployeeService(EmployeeRepository(db))` where `db` comes from `Depends(get_db)`; `DirectoryPage` calls `useEmployeesQuery`, which calls `apiGet`.

**Control flow:** `EmployeeService.list_employees` — validate `sort_by` against the allow-list (raise `InvalidReferenceError` → 422 if not); delegate to `repository.list`; return `(rows, total)` unchanged. `repository.list` — build a base query, apply `ORDER BY` on the validated column, apply `OFFSET`/`LIMIT` from `(page - 1) * page_size` and `page_size`, execute; run a separate `COUNT(*)` query without the offset/limit for `total`.

**Tests:** new `backend/tests/employees/test_directory.py`. Cases: requesting page 1 with page_size 50 against a 10,000-row fixture returns 50 items and `total: 10000` (Many, AC 5.2.1); requesting a page number past the last page returns an empty `items` list with 200, not an error (Boundaries, AC 5.2.4); sorting by `salary_amount` ascending returns rows in non-decreasing salary order (Simple, AC 5.2.3); sorting by an unlisted column returns 422 (Exceptions — this guards the SQL-injection-via-column-name risk, not just AC 5.2.3's happy path); requesting against an empty database returns `items: []`, `total: 0` (Zero). New `frontend/src/features/employees/__tests__/directory-page.test.tsx` (MSW-backed): the Directory screen renders a row for each employee in a faked first page of results, and re-requests page 2 when the pagination control advances (AC 5.2.1, 5.2.2 behavior, not the literal timing).

**Standards that bite here:** Clean Code fail-fast (sort-column allow-list validated at the boundary); SonarJS stable list keys (`getRowId` keyed by `id`, never index); Accessibility reflow rule (AC 5.2.5) — the DataGrid's default responsive behavior plus a page-level CSS max-width/overflow rule, verified in this slice's browser verification step.

**Quality checks**

- No employee list endpoint ever returns all 10,000 rows in one response — every code path is paginated.
- **The `sort_by` allow-list rejects any column name not in the explicit set** — the highest-risk assertion, since an unvalidated sort column is a direct path to a SQL error or, in a differently-built ORM, injection.
- `DirectoryPage` keys DataGrid rows by employee `id`, never array index (SonarJS `no-uniq-key`).
- CORS middleware allows exactly the Vite dev origin, not a wildcard, even though there is no auth in v1 (defense in depth costs nothing here).

**Verification (slice complete when these pass)**

1. **Tests.** Run the full test suite — all tests green.
2. **User-facing flow.** Load the Directory screen against the seeded 10,000-row database; confirm the first page renders, sorting a column re-fetches, and paging forward/back both work.
3. **Accessibility.** Tab order reaches the DataGrid and its pagination controls in a sensible sequence; the grid and pagination controls have visible focus indicators; the screen reflows to one column at 320px width with no horizontal page scroll (AC 5.2.5).

---

## Slice 3 — Search and filter the employee directory

**Key decision:** Extends slice 2's endpoint and screen with search and filter query parameters, combined with AND semantics, still fully server-side and still paginated. No new architectural seam — this is the "near-identical, extend don't invent" case named in Part 1.

**Structure**

- `backend/app/employees/repository.py` (modify) — extend `list`'s signature to `def list(self, *, page: int, page_size: int, sort_by: str, sort_dir: str, q: str | None = None, department_id: str | None = None, country_id: str | None = None, status: EmployeeStatus | None = None) -> tuple[list[Employee], int]`.
- `backend/app/employees/service.py` (modify) — thread the same new parameters through `list_employees` unchanged (no new validation beyond what `department_id`/`country_id` already need — invalid ids simply match zero rows rather than erroring, since an unknown filter value is a valid "no results" case, not a boundary violation).
- `backend/app/employees/router.py` (modify) — add `q: str | None = None, department_id: str | None = None, country_id: str | None = None, status: EmployeeStatus | None = None` as additional query parameters on the existing `list_employees` endpoint.
- `frontend/src/features/employees/FilterBar.tsx` (new) — `Readonly<{ value: FilterState; onChange: (next: FilterState) => void }>`; a text field (search) plus three `Select` dropdowns (department, country, status), each with an associated `<label>` (Accessibility Checklist labeling rule).
- `frontend/src/features/employees/api.ts` (modify) — extend `useEmployeesQuery`'s params with `q?, departmentId?, countryId?, status?`.
- `frontend/src/features/employees/DirectoryPage.tsx` (modify) — render `FilterBar` above the grid, hold filter state, pass it into `useEmployeesQuery`.

**Collaborators:** unchanged from slice 2 — `FilterBar` calls back into `DirectoryPage`'s state, which flows into the existing `useEmployeesQuery` call.

**Control flow:** `repository.list` — apply `WHERE (lower(first_name) LIKE :q OR lower(last_name) LIKE :q OR lower(email) LIKE :q)` when `q` is present (case-insensitive fragment match); apply `department_id = :department_id`, `country_id = :country_id`, `status = :status` when each is present; all present filters combine with `AND`, exactly mirroring slice 2's ordering/pagination logic applied afterward.

**Tests:** new `backend/tests/employees/test_search_filter.py`. Cases: searching a name fragment returns only matching employees, case-insensitively (Simple, AC 5.3.1); combining department + country + status filters returns only rows matching all three (Many/Interfaces, AC 5.3.2); a filter combination matching zero employees returns `items: []` with 200 (Zero, AC 5.3.4 — backend half); filters still respect pagination and sorting from slice 2 without parameter conflicts (Interfaces, AC 5.3.3). New `frontend/src/features/employees/__tests__/filter-bar.test.tsx`: typing into the search field and picking a department both update what `useEmployeesQuery` is called with; an MSW-faked zero-match response renders the directory's empty state, not a blank table (AC 5.3.4 — frontend half).

**Standards that bite here:** Accessibility labeled-controls rule (AC 5.3.5) — every `FilterBar` input has a programmatically associated label via `<label htmlFor>` or `aria-label`, not a bare placeholder.

**Quality checks**

- An unknown (non-matching) `department_id` or `country_id` filter value returns zero rows, not an error — filters are data predicates, not reference-data validation.
- Every `FilterBar` control resolves to an accessible name via the browser's accessibility tree (label, not placeholder-only).
- No client-side re-filtering of an already-fetched page — all filtering happens server-side, consistent with slice 2's server-pagination decision.

**Verification (slice complete when these pass)**

1. **Tests.** Run the full test suite — all tests green.
2. **User-facing flow.** Type a search fragment, pick a department and a country, confirm the grid narrows to matching rows and an empty combination shows the explicit empty state.
3. **Accessibility.** Every filter control is reachable by keyboard and announces a name via its label when focused.

---

## Slice 4 — View an employee's full profile

**Key decision:** The simplest slice in the plan — a single-record read reached by clicking a directory row, landing on a bookmarkable URL. No new backend pattern beyond a `get_by_id`.

**Structure**

- `backend/app/employees/repository.py` (modify) — `def get_by_id(self, employee_id: int) -> Employee | None`.
- `backend/app/employees/service.py` (modify) — `def get_employee(self, employee_id: int) -> Employee` (raises `NotFoundError` when `repository.get_by_id` returns `None` — the `return null` anti-pattern per code-craft is avoided by raising a typed error instead).
- `backend/app/employees/router.py` (modify) — `@router.get("/{employee_id}", response_model=EmployeeRead) def get_employee(employee_id: int, db: Session = Depends(get_db)) -> EmployeeRead`.
- `frontend/src/features/employees/ProfilePage.tsx` (new) — `Readonly<{}>` (reads `employeeId` from the router's path param); renders every `Employee` field not shown in the directory table (full job title, hire date, email).
- `frontend/src/features/employees/api.ts` (modify) — `function useEmployeeQuery(employeeId: number): UseQueryResult<Employee>`.
- Frontend routing (wherever slice 2 set up the router — likely `frontend/src/App.tsx`, modify) — add a route `/employees/:employeeId` rendering `ProfilePage`; `DirectoryPage`'s row click navigates there.

**Collaborators:** `router.get_employee` constructs `EmployeeService(EmployeeRepository(db))`, same pattern as slice 2; `ProfilePage` calls `useEmployeeQuery`, which calls `apiGet`.

**Control flow:** `service.get_employee` — call `repository.get_by_id`; if `None`, raise `NotFoundError(f"employee {employee_id} not found")`; else return the row.

**Tests:** new `backend/tests/employees/test_profile.py`. Cases: fetching a seeded employee's id returns its full record (Simple, AC 5.4.1); fetching an id that doesn't exist returns 404 with a `{code, message}` body (Exceptions, AC 5.4.2). New `frontend/src/features/employees/__tests__/profile-page.test.tsx`: clicking a directory row navigates to and renders that employee's profile (AC 5.4.3).

**Standards that bite here:** Clean Code `return null` is a defect — `NotFoundError` used instead, consistent with slice-wide convention every later slice reuses.

**Quality checks**

- `get_employee` never returns `None` — every not-found path raises `NotFoundError`, caught only by the shared exception handler from slice 1.
- The Profile route is directly navigable by URL (not reachable only via client-side row-click state), satisfying "directly bookmarkable" (AC 5.4.3).

**Verification (slice complete when these pass)**

1. **Tests.** Run the full test suite — all tests green.
2. **User-facing flow.** Click a directory row, confirm the profile screen shows the full record; load the profile URL directly and confirm it renders the same record without going through the directory first.
3. **Accessibility.** The profile screen's heading structure and focus order are sensible; returning to the directory (e.g. a back action) is keyboard-reachable.

---

## Slice 5 — Add a new employee

**Key decision:** Introduces the write path and the country→currency resolution (Decision 2) that slice 6 will reuse. Validation is fail-fast at the Pydantic boundary; currency is never a form field.

**Structure**

- `backend/app/employees/schemas.py` (modify) — `class EmployeeCreate(BaseModel): first_name: str; last_name: str; email: EmailStr; job_title: str; department_id: str; country_id: str; hire_date: date; salary_amount: Decimal = Field(gt=0)` `[verified: Pydantic v2 `Field(gt=0)` constraint syntax]` — no `salary_currency` field, per Decision 2.
- `backend/app/employees/service.py` (modify) — `def resolve_currency(country_id: str) -> str` (module-level or static — takes only `country_id`, calls `core.reference_data.country_by_id`, returns `.currency_code`; raises `InvalidReferenceError` on an unknown country, which also covers an unknown department via the same pattern applied to `department_id`); `def create_employee(self, data: EmployeeCreate) -> Employee` (validates `department_id`/`country_id` exist via reference-data lookups, calls `resolve_currency`, constructs an `Employee` ORM instance with `status=EmployeeStatus.ACTIVE`, delegates to `repository.create`).
- `backend/app/employees/repository.py` (modify) — `def create(self, employee: Employee) -> Employee` (`db.add`, `db.commit`, `db.refresh`, return).
- `backend/app/employees/router.py` (modify) — `@router.post("", response_model=EmployeeRead, status_code=201) def create_employee(payload: EmployeeCreate, db: Session = Depends(get_db)) -> EmployeeRead`.
- `frontend/src/features/employees/EmployeeForm.tsx` (new) — `Readonly<{ mode: "add" | "edit"; initialValues?: Partial<EmployeeFormValues>; onSubmit: (values: EmployeeFormValues) => void }>`; built on `react-hook-form`'s `useForm` `[inferred: react-hook-form's `useForm`/`Controller` pattern for MUI-integrated fields — the build agent should confirm the exact MUI+RHF wiring against the installed `react-hook-form` version's docs]`; fields for every `EmployeeCreate` field, no currency field (currency is derived, shown read-only once a country is picked, if shown at all).
- `frontend/src/features/employees/AddEmployeePage.tsx` (new) — `Readonly<{}>`; renders `EmployeeForm` in `"add"` mode, calls the create mutation on submit, navigates to the new employee's profile on success.
- `frontend/src/features/employees/api.ts` (modify) — `function useCreateEmployeeMutation(): UseMutationResult<Employee, ApiError, EmployeeFormValues>`.

**Collaborators:** `router.create_employee` constructs `EmployeeService(EmployeeRepository(db))`; `service.create_employee` calls `resolve_currency` and `core.reference_data.department_by_id`/`country_by_id` before touching the repository.

**Control flow:** `create_employee` — Pydantic validates types/required-fields/`salary_amount > 0` before the handler body even runs (a malformed payload never reaches `service`); service validates `department_id` and `country_id` against reference data (raise `InvalidReferenceError` → 422 on either miss); service resolves currency; service constructs the ORM row; repository commits; router returns 201 with the created record including its new id.

**Tests:** new `backend/tests/employees/test_add_employee.py`. Cases: a fully valid payload creates a row and returns 201 with an id (Simple, AC 5.5.1); a zero or negative salary returns 422 and creates no row (Boundaries/Exceptions, AC 5.5.2); omitting a required field (e.g. `department_id`) returns 422 listing every invalid field via FastAPI's default validation-error body, not just the first (Exceptions, AC 5.5.3); a malformed email returns 422 without reaching the database (Exceptions, AC 5.5.4); the created employee's `salary_currency` matches its `country_id`'s currency and is not present as an accepted input field at all (Interfaces, AC 5.5.5); an unknown `department_id` or `country_id` returns 422 (Exceptions — a case AC 5.5.3 implies but doesn't name outright). New `frontend/src/features/employees/__tests__/add-employee-page.test.tsx`: submitting a complete form navigates to the new employee's profile; submitting with a negative salary shows a field-level validation message and does not submit (AC 5.5.2 — frontend half); the name/email inputs carry `autoComplete` attributes (AC 5.5.6).

**Standards that bite here:** Clean Code fail-fast at boundaries (Pydantic + reference-data validation, nothing re-validated deeper in the stack); Accessibility autocomplete rule (AC 5.5.6); this slice must not add a `salary_currency` form field or accept one from the client — direct enforcement of spec [invariant 4.5](../specs/001-employee-salary-management-spec.md#4-invariants) and Decision 2.

**Quality checks**

- `EmployeeCreate` has no `salary_currency` field anywhere in its schema — **the single highest-risk check in this slice**, since a stray currency field would silently reopen the per-employee-currency-override case the spec explicitly deferred ([§9.2](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)).
- A 422 response from an invalid create payload lists every invalid field, not only the first one encountered.
- No employee row is ever committed when validation fails at any layer (Pydantic or reference-data).
- Name and email fields on the Add form carry `autoComplete` attributes appropriate to their content.

**Verification (slice complete when these pass)**

1. **Tests.** Run the full test suite — all tests green.
2. **User-facing flow.** Fill and submit the Add form with valid data; confirm the new employee appears in the Directory (slice 2/3) and its Profile (slice 4) shows the correct auto-derived currency.
3. **Accessibility.** Every form field has an associated label; validation errors are announced (e.g. `aria-describedby` linking the field to its error text) rather than conveyed by color alone.

---

## Slice 6 — Edit an employee's details and salary

**Key decision:** Partial update reusing slice 5's `resolve_currency` — editing `country_id` re-derives `salary_currency`, editing anything else leaves it untouched. This is the slice most tempting to "helpfully" add salary-history tracking to; it must not (Part 1 risk list).

**Structure**

- `backend/app/employees/schemas.py` (modify) — `class EmployeeUpdate(BaseModel): first_name: str | None = None; last_name: str | None = None; email: EmailStr | None = None; job_title: str | None = None; department_id: str | None = None; country_id: str | None = None; hire_date: date | None = None; salary_amount: Decimal | None = Field(default=None, gt=0)` — still no `salary_currency` field.
- `backend/app/employees/service.py` (modify) — `def update_employee(self, employee_id: int, data: EmployeeUpdate) -> Employee` (loads via `get_employee` from slice 4, reusing it rather than re-deriving a not-found check; applies every field present in `data` via `model_dump(exclude_unset=True)` `[verified: Pydantic v2's documented pattern for partial-update payloads]`; if `country_id` is among the updated fields, calls the same module-level `resolve_currency` from slice 5 — not a re-implementation — and also re-validates the new `department_id`/`country_id` against reference data exactly as slice 5's create path does).
- `backend/app/employees/repository.py` (modify) — `def update(self, employee: Employee) -> Employee` (the employee instance is already mutated by the service; this method just commits and refreshes).
- `backend/app/employees/router.py` (modify) — `@router.patch("/{employee_id}", response_model=EmployeeRead) def update_employee(employee_id: int, payload: EmployeeUpdate, db: Session = Depends(get_db)) -> EmployeeRead`.
- `frontend/src/features/employees/EditEmployeePage.tsx` (new) — `Readonly<{}>`; loads the employee via `useEmployeeQuery` (slice 4), renders `EmployeeForm` (slice 5) in `"edit"` mode with `initialValues` pre-filled, calls the update mutation on submit.
- `frontend/src/features/employees/api.ts` (modify) — `function useUpdateEmployeeMutation(employeeId: number): UseMutationResult<Employee, ApiError, Partial<EmployeeFormValues>>`; on success, invalidate both the employee-detail and employee-list query caches `[inferred: TanStack Query's `queryClient.invalidateQueries` is the documented cache-invalidation mechanism — confirm exact call shape against the installed version]` so the Profile and Directory reflect the edit immediately (AC 5.6.5).

**Collaborators:** `service.update_employee` calls its own `get_employee` (slice 4) and the shared `resolve_currency` (slice 5) — no duplicated lookup logic.

**Control flow:** `update_employee` — load the existing row via `get_employee` (raises `NotFoundError` → 404 if missing, AC 5.6.4); for each field present in the partial payload, assign it onto the loaded ORM instance; if `country_id` was one of the updated fields, re-resolve `salary_currency` via `resolve_currency`, keeping it unchanged otherwise; if `salary_amount` was updated, Pydantic's `gt=0` constraint already rejected a non-positive value before the handler ran; commit; return the refreshed row.

**Tests:** new `backend/tests/employees/test_edit_employee.py`. Cases: patching only `salary_amount` updates that field and leaves every other field unchanged (Simple, AC 5.6.1); patching a negative salary returns 422 and the stored row is unchanged (Boundaries/Exceptions, AC 5.6.2); patching `country_id` also updates `salary_currency` to match the new country, and patching any other field leaves `salary_currency` unchanged (Interfaces, AC 5.6.3); patching a non-existent employee id returns 404 (Exceptions, AC 5.6.4); after a successful patch, re-fetching the same employee reflects the new value with no stale cache on the backend side (Simple, AC 5.6.5 — backend half, i.e. the repository actually persisted the change). New `frontend/src/features/employees/__tests__/edit-employee-page.test.tsx`: editing salary and saving re-renders the Profile screen with the new value without a manual refresh (AC 5.6.5 — frontend half, via query invalidation).

**Standards that bite here:** Clean Code — reuse over reinvention (`resolve_currency`, `get_employee` both reused, not duplicated); this slice's diff must not add any column, table, or field related to salary history — direct guard against the [§9.1](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits) scope-creep risk named in Part 1.

**Quality checks**

- **This slice's diff contains no new table, column, or model related to salary history** — the top risk named in Part 1's "Where this could go wrong."
- `update_employee` calls the same `resolve_currency` function slice 5 defined — grep-visible as one definition, two call sites, not two definitions.
- Editing a field other than `country_id` never changes `salary_currency`.
- A failed validation (negative salary, unknown country) leaves the stored row byte-for-byte unchanged.

**Verification (slice complete when these pass)**

1. **Tests.** Run the full test suite — all tests green.
2. **User-facing flow.** Edit an employee's salary and save; confirm the Profile and Directory both show the new value without a manual page reload. Edit an employee's country and confirm the displayed currency updates to match.
3. **Accessibility.** Same checks as slice 5's form (labels, error announcement) — the Edit form reuses `EmployeeForm`, so this step confirms no regression rather than re-testing from scratch.

---

## Slice 7 — Deactivate an employee

**Key decision:** The simplest state transition in the plan — idempotent, never deletes, per [invariant 4.3](../specs/001-employee-salary-management-spec.md#4-invariants). No new architectural pattern.

**Structure**

- `backend/app/employees/service.py` (modify) — `def deactivate_employee(self, employee_id: int) -> Employee` (loads via `get_employee`, sets `status = EmployeeStatus.INACTIVE` unconditionally — assigning `INACTIVE` to an already-`INACTIVE` row is a no-op write, which is exactly what idempotence requires here, not a special-cased branch).
- `backend/app/employees/router.py` (modify) — `@router.post("/{employee_id}/deactivate", response_model=EmployeeRead) def deactivate_employee(employee_id: int, db: Session = Depends(get_db)) -> EmployeeRead`.
- `frontend/src/shared/ui/StatusBadge.tsx` (modify from slice 2's stub, or new if slice 2 didn't need it yet) — `Readonly<{ status: "active" | "inactive" }>` — a visibly distinct badge (color + text, not color alone, per WCAG's non-color-alone principle) used by both `DirectoryPage` and `ProfilePage`.
- `frontend/src/features/employees/ProfilePage.tsx` (modify) — add a "Deactivate" action, disabled/hidden once the employee is already `inactive` (a UI nicety, not a correctness requirement — the backend is idempotent regardless).
- `frontend/src/features/employees/api.ts` (modify) — `function useDeactivateEmployeeMutation(employeeId: number): UseMutationResult<Employee, ApiError, void>`.

**Collaborators:** unchanged pattern from slices 4–6 — router constructs `EmployeeService(EmployeeRepository(db))`.

**Control flow:** `deactivate_employee` — load via `get_employee` (404 if missing); set `status = INACTIVE`; commit; return. No branch on current status — assignment is inherently idempotent.

**Tests:** new `backend/tests/employees/test_deactivate_employee.py`. Cases: deactivating an active employee sets status to inactive and the row still exists afterward, confirmed by a subsequent fetch (Simple, AC 5.7.1); deactivating an already-inactive employee returns 200 with status still inactive, not an error (Boundaries — idempotence, AC 5.7.3); a deactivated employee is excluded from default analytics figures — this assertion is written here as a call into `analytics.service` from the test, or deferred entirely to slice 8's own test suite if that dependency direction is awkward to test from `employees/`; prefer deferring to slice 8 to keep this test file's collaborators within its own domain (Interfaces, spec invariant 4.4, generally verified — concretely asserted in slice 8). New `frontend/src/features/employees/__tests__/deactivate-employee.test.tsx`: clicking Deactivate on the Profile screen updates the visible status badge without a manual refresh; the Directory screen shows the same employee labeled Inactive (AC 5.7.4).

**Standards that bite here:** none beyond the plan-wide conventions — this is the plan's simplest slice by design.

**Quality checks**

- Deactivating twice in a row produces no error and no change in the second call's effect (true idempotence, not "second call is a no-op that happens to also return 200").
- The employee row's id and every other field besides `status` are unchanged by deactivation.
- The Inactive badge is distinguishable by more than color alone (text label, not just a red dot).

**Verification (slice complete when these pass)**

1. **Tests.** Run the full test suite — all tests green.
2. **User-facing flow.** Deactivate an employee from their Profile screen; confirm the badge updates there and in the Directory; confirm the employee is still visible (not removed) in both.
3. **Accessibility.** The status badge's information is conveyed in text, not color alone; the Deactivate action is keyboard-reachable and its result is confirmed via a live-region announcement or an equivalent non-visual cue.

---

## Slice 8 — View org-wide pay analytics

**Key decision:** The plan's hardest reasoning: department aggregates report native currency when a department's employees all share one currency, and USD-normalized figures (via the seed-time FX snapshot) when they don't (Decision 3); country aggregates are always native, since one country implies one currency ([invariant 4.5](../specs/001-employee-salary-management-spec.md#4-invariants)). Median is computed in Python, not SQL, for the reason given in Decision 3.

**Structure**

- `backend/app/analytics/schemas.py` (new) — `class DepartmentAggregate(BaseModel): department_id: str; department_name: str; currency: str; headcount: int; avg_salary: Decimal; median_salary: Decimal; min_salary: Decimal; max_salary: Decimal`; `class CountryAggregate(BaseModel): country_id: str; country_name: str; currency: str; headcount: int; avg_salary: Decimal; median_salary: Decimal; min_salary: Decimal; max_salary: Decimal`; `class PayBandBucket(BaseModel): label: str; headcount: int`.
- `backend/app/analytics/repository.py` (new) — `class AnalyticsRepository: def __init__(self, db: Session) -> None`; `def salaries_grouped_by(self, *, group_column: Literal["department_id", "country_id"], include_inactive: bool) -> dict[str, list[tuple[Decimal, str]]]` (one query selecting `(group_column, salary_amount, salary_currency)` filtered by status unless `include_inactive`, grouped in Python into `{group_id: [(amount, currency), ...]}` — one query, Python-side grouping, per Decision 3); `def all_salaries(self, *, include_inactive: bool) -> list[tuple[Decimal, str]]` (one query, every included employee's `(salary_amount, salary_currency)`, for pay-band bucketing).
- `backend/app/analytics/service.py` (new) — `class AnalyticsService: def __init__(self, repository: AnalyticsRepository) -> None`; `def department_aggregates(self, *, include_inactive: bool) -> list[DepartmentAggregate]`; `def country_aggregates(self, *, include_inactive: bool) -> list[CountryAggregate]`; `def pay_band_distribution(self, *, include_inactive: bool) -> list[PayBandBucket]`; private helper `def _stats(values: list[Decimal]) -> tuple[Decimal, Decimal, Decimal, Decimal]` returning `(avg, median, min, max)` via `statistics.mean`/`statistics.median` — one shared implementation, called by both `department_aggregates` and `country_aggregates`, so avg/median/min/max are computed identically everywhere (directly enacting Decision 3's "one computation path").
- `backend/app/analytics/router.py` (new) — `router = APIRouter(prefix="/api/analytics", tags=["analytics"])`; `@router.get("/by-department", response_model=list[DepartmentAggregate]) def department_analytics(include_inactive: bool = False, db: Session = Depends(get_db)) -> list[DepartmentAggregate]`; equivalent `@router.get("/by-country", ...)` and `@router.get("/pay-bands", response_model=list[PayBandBucket])`.
- `backend/app/main.py` (modify) — `app.include_router(analytics.router)`.
- `frontend/src/features/analytics/api.ts` (new) — `function useDepartmentAnalyticsQuery(includeInactive: boolean): UseQueryResult<DepartmentAggregate[]>`; equivalent `useCountryAnalyticsQuery`, `usePayBandsQuery`.
- `frontend/src/features/analytics/AnalyticsPage.tsx` (new) — `Readonly<{}>`; an `includeInactive` toggle (visibly labeled, its current state always rendered next to the figures it affects — AC 5.8.5) shared across the three queries; renders `DepartmentTable`, `CountryTable`, `PayBandChart`.
- `frontend/src/features/analytics/DepartmentTable.tsx`, `CountryTable.tsx` (new) — `Readonly<{ rows: DepartmentAggregate[] | CountryAggregate[] }>` — simple MUI `Table`, not DataGrid (row counts here are ~9 and ~10, not 10,000 — DataGrid's server pagination machinery would be unjustified complexity for this table).
- `frontend/src/features/analytics/PayBandChart.tsx` (new) — `Readonly<{ buckets: PayBandBucket[] }>` — MUI X `BarChart` `[inferred: `@mui/x-charts`'s `BarChart` component with a `dataset`/`series` prop shape — confirm against the installed version's docs, since this is a newer, faster-moving package than DataGrid]`.

**Collaborators:** router constructs `AnalyticsService(AnalyticsRepository(db))`, the same per-request construction pattern as every prior slice's router; `AnalyticsService` never imports `employees.repository` or `employees.models` directly — it reads employee salary data only via its own `AnalyticsRepository`'s queries against the same `Employee` table, which is the architecturally sanctioned path (reading the shared table through its own repository, not through the `employees` domain's service, since there's no employee-shaped business operation being invoked here — just a different read shape over the same data).

**Control flow:**
- `department_aggregates`: call `repository.salaries_grouped_by(group_column="department_id", include_inactive=...)`; for each department in `core.reference_data.DEPARTMENTS` (iterating the reference list, not just the ids seen in data, so a department with zero current employees still appears with `headcount: 0` rather than being silently omitted): look up its grouped values; if the group is empty, emit a zero-headcount row with `currency` defaulted to the department's... — no department has an intrinsic currency, so a zero-headcount department reports `currency: "USD"` and all-zero figures, documented inline as the empty-group convention; else compute the distinct currencies present in the group — if exactly one, use that currency and the raw native amounts; if more than one, convert every amount via `core.reference_data.to_usd` and use `currency: "USD"`; call the shared `_stats` helper on the resulting amount list; assemble `DepartmentAggregate`.
- `country_aggregates`: same shape, grouped by `country_id`, but always uses the country's own currency directly (no multi-currency branch — invariant 4.5 guarantees one currency per country) and iterates `core.reference_data.COUNTRIES` the same zero-headcount-inclusive way.
- `pay_band_distribution`: call `repository.all_salaries`; convert every amount to USD via `to_usd`; for each `PayBand` in `core.reference_data.PAY_BANDS`, count how many converted amounts fall in `[min_usd, max_usd)` (or `>= min_usd` when `max_usd is None`, the open-ended top band); assemble `PayBandBucket` per band in the reference list's order.

**Tests:** new `backend/tests/analytics/test_analytics.py`. Cases: department aggregates over a fixture with two employees in the same department and same currency return that currency and correctly averaged/median/min/max figures (Simple, AC 5.8.1 single-currency branch); a department with employees split across two currencies returns `currency: "USD"` and figures computed from converted amounts, not native ones (Interfaces/Boundaries — the highest-risk case, AC 5.8.1 multi-currency branch); country aggregates always report the country's native currency (Simple, AC 5.8.2); pay-band distribution places a known salary/currency fixture into the expected band after conversion, including one value exactly at a band boundary (Boundaries, AC 5.8.3); every analytics endpoint excludes inactive employees by default and includes them only when `include_inactive=true` is passed (Interfaces, AC 5.8.4, and confirms invariant 4.4 end-to-end including the deactivation path from slice 7); a department or country with zero current employees still appears with `headcount: 0` rather than being omitted (Zero); analytics over an entirely empty employee table returns every department/country at zero headcount and every pay band at zero, not an error (Zero, whole-endpoint case). New `frontend/src/features/analytics/__tests__/analytics-page.test.tsx`: the `includeInactive` toggle's current state is always visibly rendered next to the figures (AC 5.8.5); toggling it triggers a re-fetch reflected in the rendered tables.

**Standards that bite here:** Clean Code single-responsibility (`_stats` factored out once, used twice, rather than duplicated per aggregate type); this is the slice where a wrong branch is least likely to throw and most likely to just be quietly wrong — see the Quality checks below.

**Quality checks**

- **A department whose employees span more than one currency reports `currency: "USD"` with converted figures; a single-currency department reports its native currency with unconverted figures — this is the single highest-risk assertion in the entire plan** and must have a dedicated test fixture proving both branches, not just the single-currency happy path.
- Country aggregates never take the multi-currency branch — there is no such branch in `country_aggregates` at all, only in `department_aggregates` (structurally enforced by not writing the branch, not by a runtime check).
- `avg_salary`, `median_salary`, `min_salary`, `max_salary` are computed via the one shared `_stats` helper in every aggregate, never duplicated per-endpoint arithmetic.
- Every analytics endpoint issues exactly one grouped/aggregate query (plus, for pay-bands, one flat query) — never one query per department or per country (the N+1 shape AC 5.8.6 rules out).
- A deactivated employee (slice 7) is excluded from every default (non-`include_inactive`) aggregate — the end-to-end proof of invariant 4.4.

**Verification (slice complete when these pass)**

1. **Tests.** Run the full test suite — all tests green.
2. **User-facing flow.** Open the Analytics screen against the seeded 10,000-row database; confirm department and country tables render with plausible figures, the pay-band chart renders, and toggling "include inactive" changes the numbers after deactivating at least one employee via slice 7's flow.
3. **Accessibility.** The `includeInactive` toggle is a real labeled control (not a bare icon button); the bar chart has an accessible text alternative (e.g. a visually-hidden data table or `aria-label` summarizing the series) since a chart-only rendering conveys nothing to a screen-reader user.

---

## Hard floors

None. No slice in this plan touches authentication, authorization/guards, payment flows, cryptography/secrets, or schema migrations (schema is created once via `Base.metadata.create_all`, not a migration tool) — none of the designated high-risk categories apply. The single highest-risk logic in the plan (slice 8's dual-currency branch) is guarded by an explicit dedicated test and quality check rather than a hard floor, since it is a correctness risk, not a security/compliance one.

## Escalation log

*(empty at authoring — `/anthara:plan-implementer` appends one-way tier bumps here, with reasons, as it executes.)*
