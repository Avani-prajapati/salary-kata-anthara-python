from __future__ import annotations

import pytest

from app.scripts.seed import generate_employees


@pytest.fixture(scope="module")
def ten_thousand_employees():
    return generate_employees(count=10_000, seed=42)


def test_first_page_of_the_directory_returns_fifty_employees_and_the_full_total_count(
    client, employee_repository, ten_thousand_employees
):
    employee_repository.bulk_insert(ten_thousand_employees)

    response = client.get("/api/employees", params={"page": 1, "pageSize": 50})

    body = response.json()
    assert response.status_code == 200
    assert len(body["items"]) == 50
    assert body["total"] == 10_000


def test_requesting_a_page_past_the_last_page_returns_an_empty_list_not_an_error(
    client, employee_repository
):
    employee_repository.bulk_insert(generate_employees(count=5, seed=1))

    response = client.get("/api/employees", params={"page": 999, "pageSize": 50})

    body = response.json()
    assert response.status_code == 200
    assert body["items"] == []
    assert body["total"] == 5


def test_sorting_by_salary_returns_rows_in_non_decreasing_salary_order(
    client, employee_repository
):
    employee_repository.bulk_insert(generate_employees(count=30, seed=2))

    response = client.get(
        "/api/employees",
        params={"page": 1, "pageSize": 30, "sortBy": "salary_amount", "sortDir": "asc"},
    )

    salaries = [float(item["salary_amount"]) for item in response.json()["items"]]
    assert salaries == sorted(salaries)


def test_sorting_by_a_column_outside_the_allow_list_is_rejected(client, employee_repository):
    employee_repository.bulk_insert(generate_employees(count=5, seed=3))

    response = client.get("/api/employees", params={"sortBy": "email"})

    body = response.json()
    assert response.status_code == 422
    assert body["code"] == "invalid_reference"


def test_listing_the_directory_against_an_empty_database_returns_no_items_and_zero_total(client):
    response = client.get("/api/employees")

    body = response.json()
    assert response.status_code == 200
    assert body["items"] == []
    assert body["total"] == 0
