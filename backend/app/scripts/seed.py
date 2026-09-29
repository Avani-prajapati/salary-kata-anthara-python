from __future__ import annotations

import argparse
import random
import sys
from collections import Counter
from decimal import Decimal

from faker import Faker

from app.core import db
from app.core.reference_data import CURRENCY_RATES, COUNTRIES, DEPARTMENTS, Country, Department
from app.employees.models import Employee, EmployeeStatus
from app.employees.repository import EmployeeRepository

DEPARTMENT_BASE_SALARY_USD: dict[str, Decimal] = {
    "engineering": Decimal("95000"),
    "sales": Decimal("70000"),
    "marketing": Decimal("65000"),
    "finance": Decimal("80000"),
    "hr": Decimal("60000"),
    "operations": Decimal("62000"),
    "customer_support": Decimal("45000"),
    "legal": Decimal("105000"),
    "product": Decimal("90000"),
}

COUNTRY_COST_OF_LIVING_MULTIPLIER: dict[str, Decimal] = {
    "us": Decimal("1.00"),
    "gb": Decimal("0.85"),
    "de": Decimal("0.90"),
    "fr": Decimal("0.85"),
    "in": Decimal("0.35"),
    "ca": Decimal("0.90"),
    "au": Decimal("0.95"),
    "sg": Decimal("0.90"),
    "br": Decimal("0.45"),
    "jp": Decimal("0.80"),
}

DEPARTMENT_WEIGHTS: dict[str, int] = {
    "engineering": 25,
    "sales": 15,
    "marketing": 10,
    "finance": 10,
    "hr": 8,
    "operations": 12,
    "customer_support": 12,
    "legal": 4,
    "product": 4,
}

COUNTRY_WEIGHTS: dict[str, int] = {
    "us": 30,
    "gb": 12,
    "de": 10,
    "fr": 8,
    "in": 15,
    "ca": 8,
    "au": 6,
    "sg": 5,
    "br": 4,
    "jp": 2,
}

_DEPARTMENT_SELECTION_WEIGHTS = [DEPARTMENT_WEIGHTS[department.id] for department in DEPARTMENTS]
_COUNTRY_SELECTION_WEIGHTS = [COUNTRY_WEIGHTS[country.id] for country in COUNTRIES]

_JITTER_MIN = Decimal("0.85")
_JITTER_MAX = Decimal("1.15")


def _draw_salary(rng: random.Random, department: Department, country: Country) -> Decimal:
    jitter = Decimal(str(rng.uniform(float(_JITTER_MIN), float(_JITTER_MAX))))
    base_usd = DEPARTMENT_BASE_SALARY_USD[department.id]
    multiplier = COUNTRY_COST_OF_LIVING_MULTIPLIER[country.id]
    salary_usd = base_usd * multiplier * jitter
    usd_rate = CURRENCY_RATES[country.currency_code].usd_rate
    salary_native = salary_usd / usd_rate
    return salary_native.quantize(Decimal("0.01"))


def generate_employees(count: int, seed: int) -> list[Employee]:
    rng = random.Random(seed)
    fake = Faker()
    fake.seed_instance(seed)

    employees = []
    for _ in range(count):
        department = rng.choices(DEPARTMENTS, weights=_DEPARTMENT_SELECTION_WEIGHTS)[0]
        country = rng.choices(COUNTRIES, weights=_COUNTRY_SELECTION_WEIGHTS)[0]
        first_name = fake.first_name()
        last_name = fake.last_name()
        email = fake.unique.email()
        job_title = fake.job()
        hire_date = fake.date_between(start_date="-10y", end_date="today")
        salary_amount = _draw_salary(rng, department, country)

        employees.append(
            Employee(
                first_name=first_name,
                last_name=last_name,
                email=email,
                job_title=job_title,
                department_id=department.id,
                country_id=country.id,
                salary_amount=salary_amount,
                salary_currency=country.currency_code,
                hire_date=hire_date,
                status=EmployeeStatus.ACTIVE,
            )
        )
    return employees


def _print_summary(employees: list[Employee]) -> None:
    print(f"Seeded {len(employees)} employees.")
    for country_id, headcount in sorted(Counter(employee.country_id for employee in employees).items()):
        print(f"  {country_id}: {headcount}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Seed the employee database with generated data.")
    parser.add_argument("--count", type=int, default=10_000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--reset", action="store_true", help="Drop and recreate the schema before seeding.")
    args = parser.parse_args(argv)

    db.init_db()
    session = db.SessionLocal()
    try:
        repository = EmployeeRepository(session)
        existing_count = repository.count_all()

        if existing_count > 0 and not args.reset:
            print(
                f"Refusing to seed: database already contains {existing_count} employees. "
                "Pass --reset to replace them."
            )
            return 1

        if args.reset and existing_count > 0:
            db.Base.metadata.drop_all(bind=db.engine)
            db.Base.metadata.create_all(bind=db.engine)

        employees = generate_employees(count=args.count, seed=args.seed)
        repository.bulk_insert(employees)
        _print_summary(employees)
        return 0
    finally:
        session.close()


if __name__ == "__main__":
    sys.exit(main())
