from __future__ import annotations

import pytest

from app.scripts.seed import generate_employees


def test_fetching_a_seeded_employee_returns_the_full_record(client, employee_repository):
    employees = generate_employees(count=5, seed=1)
    employee_repository.bulk_insert(employees)
    employee = employees[0]

    response = client.get(f"/api/employees/{employee.id}")

    body = response.json()
    assert response.status_code == 200
    assert body["id"] == employee.id
    assert body["first_name"] == employee.first_name
    assert body["last_name"] == employee.last_name
    assert body["email"] == employee.email
    assert body["job_title"] == employee.job_title
    assert body["department_id"] == employee.department_id
    assert body["country_id"] == employee.country_id
    assert body["salary_amount"] == str(employee.salary_amount)
    assert body["salary_currency"] == employee.salary_currency
    assert body["hire_date"] == employee.hire_date.isoformat()
    assert body["status"] == employee.status.value


def test_fetching_a_nonexistent_employee_returns_404_with_a_code_and_message(client):
    response = client.get("/api/employees/999")

    body = response.json()
    assert response.status_code == 404
    assert body["code"] == "not_found"
    assert "message" in body
    assert "999" in body["message"]
