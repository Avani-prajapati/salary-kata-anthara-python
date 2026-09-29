from __future__ import annotations

import pytest

from app.core import db
from app.core.reference_data import country_by_id
from app.employees.repository import EmployeeRepository
from app.scripts.seed import generate_employees, main


@pytest.fixture(scope="module")
def full_seed_employees():
    return generate_employees(count=10_000, seed=42)


def test_seeding_an_empty_database_creates_exactly_ten_thousand_employees(in_memory_engine):
    exit_code = main([])
    session = db.SessionLocal()
    try:
        repository = EmployeeRepository(session)
        assert exit_code == 0
        assert repository.count_all() == 10_000
    finally:
        session.close()


def test_regenerating_with_the_same_seed_produces_identical_employee_data():
    def as_comparable(employee):
        return (
            employee.first_name,
            employee.last_name,
            employee.email,
            employee.job_title,
            employee.department_id,
            employee.country_id,
            employee.salary_amount,
            employee.salary_currency,
            employee.hire_date,
        )

    first_run = generate_employees(count=200, seed=99)
    second_run = generate_employees(count=200, seed=99)

    assert [as_comparable(employee) for employee in first_run] == [
        as_comparable(employee) for employee in second_run
    ]


def test_every_employee_has_a_valid_department_country_and_matching_currency(full_seed_employees):
    department_ids_by_currency = {}
    for employee in full_seed_employees:
        expected_currency = country_by_id(employee.country_id).currency_code
        assert employee.salary_currency == expected_currency
        department_ids_by_currency.setdefault(employee.department_id, set()).add(employee.salary_currency)

    departments_spanning_multiple_currencies = [
        department_id
        for department_id, currencies in department_ids_by_currency.items()
        if len(currencies) > 1
    ]
    assert departments_spanning_multiple_currencies


def test_every_generated_salary_is_strictly_positive(full_seed_employees):
    assert all(employee.salary_amount > 0 for employee in full_seed_employees)


def test_reseeding_a_populated_database_without_reset_refuses_and_adds_no_rows(in_memory_engine):
    first_exit_code = main(["--count", "50"])
    second_exit_code = main(["--count", "50"])

    session = db.SessionLocal()
    try:
        repository = EmployeeRepository(session)
        assert first_exit_code == 0
        assert second_exit_code != 0
        assert repository.count_all() == 50
    finally:
        session.close()


def test_generating_a_single_employee_returns_exactly_one_record():
    employees = generate_employees(count=1, seed=7)

    assert len(employees) == 1
