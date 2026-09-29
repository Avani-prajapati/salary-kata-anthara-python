from __future__ import annotations

from app.scripts.seed import generate_employees


def seed_one(employee_repository, **overrides):
    employee = generate_employees(count=1, seed=1)[0]
    for field, value in overrides.items():
        setattr(employee, field, value)
    employee_repository.bulk_insert([employee])
    return employee


def test_deactivating_an_active_employee_sets_status_to_inactive_and_the_row_still_exists(
    client, employee_repository
):
    employee = seed_one(employee_repository)

    response = client.post(f"/api/employees/{employee.id}/deactivate")

    body = response.json()
    assert response.status_code == 200
    assert body["status"] == "inactive"

    refetch_response = client.get(f"/api/employees/{employee.id}")
    assert refetch_response.json()["status"] == "inactive"


def test_deactivating_an_already_inactive_employee_is_idempotent(client, employee_repository):
    employee = seed_one(employee_repository, status="inactive")

    response = client.post(f"/api/employees/{employee.id}/deactivate")

    body = response.json()
    assert response.status_code == 200
    assert body["status"] == "inactive"


def test_deactivation_leaves_all_other_fields_unchanged(client, employee_repository):
    employee = seed_one(
        employee_repository,
        first_name="Ada",
        last_name="Lovelace",
        email="ada@example.com",
        job_title="Engineer",
        department_id="engineering",
        country_id="gb",
        salary_currency="GBP",
        status="active",
    )

    response = client.post(f"/api/employees/{employee.id}/deactivate")

    body = response.json()
    assert response.status_code == 200
    assert body["id"] == employee.id
    assert body["first_name"] == "Ada"
    assert body["last_name"] == "Lovelace"
    assert body["email"] == "ada@example.com"
    assert body["job_title"] == "Engineer"
    assert body["department_id"] == "engineering"
    assert body["country_id"] == "gb"
    assert body["salary_currency"] == "GBP"
    assert body["status"] == "inactive"


def test_deactivating_a_nonexistent_employee_returns_404(client):
    response = client.post("/api/employees/999/deactivate")

    body = response.json()
    assert response.status_code == 404
    assert body["code"] == "not_found"
