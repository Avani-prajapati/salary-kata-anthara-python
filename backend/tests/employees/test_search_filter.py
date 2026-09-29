from __future__ import annotations

import pytest

from app.scripts.seed import generate_employees


@pytest.fixture(scope="module")
def ten_thousand_employees():
    return generate_employees(count=10_000, seed=42)


def test_searching_a_name_fragment_returns_only_matching_employees_case_insensitively(
    client, employee_repository
):
    employees = generate_employees(count=50, seed=1)
    employee_repository.bulk_insert(employees)
    target_employee = employees[0]

    response = client.get(
        "/api/employees",
        params={"q": target_employee.first_name.lower()[:3]},
    )

    body = response.json()
    assert response.status_code == 200
    assert len(body["items"]) > 0
    assert all(
        target_employee.first_name.lower() in item["first_name"].lower()
        or target_employee.first_name.lower() in item["last_name"].lower()
        or target_employee.first_name.lower() in item["email"].lower()
        for item in body["items"]
    )


def test_searching_by_email_fragment_narrows_results(client, employee_repository):
    employees = generate_employees(count=50, seed=2)
    employee_repository.bulk_insert(employees)
    target_email_fragment = employees[0].email.split("@")[0][:3]

    response = client.get(
        "/api/employees",
        params={"q": target_email_fragment},
    )

    body = response.json()
    assert response.status_code == 200
    assert all(target_email_fragment in item["email"].lower() for item in body["items"])


def test_combining_department_country_and_status_filters_returns_only_matching_employees(
    client, employee_repository, ten_thousand_employees
):
    employee_repository.bulk_insert(ten_thousand_employees)
    target_dept = "engineering"
    target_country = "us"

    response = client.get(
        "/api/employees",
        params={
            "departmentId": target_dept,
            "countryId": target_country,
            "status": "active",
        },
    )

    body = response.json()
    assert response.status_code == 200
    assert all(
        item["department_id"] == target_dept
        and item["country_id"] == target_country
        and item["status"] == "active"
        for item in body["items"]
    )


def test_a_filter_combination_matching_zero_employees_returns_empty_items_list(
    client, employee_repository
):
    employees = generate_employees(count=10, seed=3)
    employee_repository.bulk_insert(employees)

    response = client.get(
        "/api/employees",
        params={"departmentId": "nonexistent", "countryId": "nonexistent"},
    )

    body = response.json()
    assert response.status_code == 200
    assert body["items"] == []
    assert body["total"] == 0


def test_filters_still_respect_pagination_and_sorting_from_slice_2(
    client, employee_repository
):
    employees = generate_employees(count=100, seed=4)
    employee_repository.bulk_insert(employees)
    target_dept = employees[0].department_id

    response = client.get(
        "/api/employees",
        params={
            "departmentId": target_dept,
            "page": 1,
            "pageSize": 25,
            "sortBy": "salary_amount",
            "sortDir": "asc",
        },
    )

    body = response.json()
    assert response.status_code == 200
    assert len(body["items"]) <= 25
    salaries = [float(item["salary_amount"]) for item in body["items"]]
    assert salaries == sorted(salaries)


def test_search_query_with_pagination_respects_both_filter_and_limit(
    client, employee_repository
):
    employees = generate_employees(count=50, seed=5)
    employee_repository.bulk_insert(employees)
    target_name = employees[0].first_name

    response = client.get(
        "/api/employees",
        params={"q": target_name, "page": 1, "pageSize": 10},
    )

    body = response.json()
    assert response.status_code == 200
    assert len(body["items"]) <= 10
    assert all(
        target_name.lower() in item["first_name"].lower()
        or target_name.lower() in item["last_name"].lower()
        or target_name.lower() in item["email"].lower()
        for item in body["items"]
    )
