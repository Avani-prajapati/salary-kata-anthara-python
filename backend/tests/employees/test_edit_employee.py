from __future__ import annotations

from app.scripts.seed import generate_employees


def seed_one(employee_repository, **overrides):
    employee = generate_employees(count=1, seed=1)[0]
    for field, value in overrides.items():
        setattr(employee, field, value)
    employee_repository.bulk_insert([employee])
    return employee


def test_patching_only_salary_updates_that_field_and_leaves_the_rest_unchanged(
    client, employee_repository
):
    employee = seed_one(
        employee_repository,
        first_name="Ada",
        last_name="Lovelace",
        department_id="engineering",
        country_id="gb",
        salary_currency="GBP",
    )

    response = client.patch(f"/api/employees/{employee.id}", json={"salary_amount": "120000.00"})

    body = response.json()
    assert response.status_code == 200
    assert body["salary_amount"] == "120000.00"
    assert body["first_name"] == "Ada"
    assert body["last_name"] == "Lovelace"
    assert body["department_id"] == "engineering"
    assert body["country_id"] == "gb"
    assert body["salary_currency"] == "GBP"


def test_patching_a_negative_salary_is_rejected_and_the_stored_record_is_unchanged(
    client, employee_repository
):
    employee = seed_one(employee_repository, salary_amount="95000.00")

    response = client.patch(f"/api/employees/{employee.id}", json={"salary_amount": "-500"})

    stored = employee_repository.get_by_id(employee.id)
    assert response.status_code == 422
    assert str(stored.salary_amount) == "95000.00"


def test_patching_country_also_updates_salary_currency_to_match(client, employee_repository):
    employee = seed_one(employee_repository, country_id="gb", salary_currency="GBP")

    response = client.patch(f"/api/employees/{employee.id}", json={"country_id": "jp"})

    body = response.json()
    assert response.status_code == 200
    assert body["country_id"] == "jp"
    assert body["salary_currency"] == "JPY"


def test_patching_a_field_other_than_country_leaves_salary_currency_unchanged(
    client, employee_repository
):
    employee = seed_one(employee_repository, country_id="gb", salary_currency="GBP")

    response = client.patch(f"/api/employees/{employee.id}", json={"job_title": "Staff Engineer"})

    body = response.json()
    assert response.status_code == 200
    assert body["job_title"] == "Staff Engineer"
    assert body["salary_currency"] == "GBP"


def test_patching_a_nonexistent_employee_returns_404(client):
    response = client.patch("/api/employees/999", json={"salary_amount": "50000.00"})

    body = response.json()
    assert response.status_code == 404
    assert body["code"] == "not_found"


def test_refetching_after_a_successful_patch_reflects_the_new_value(client, employee_repository):
    employee = seed_one(employee_repository, salary_amount="95000.00")

    client.patch(f"/api/employees/{employee.id}", json={"salary_amount": "150000.00"})
    response = client.get(f"/api/employees/{employee.id}")

    assert response.json()["salary_amount"] == "150000.00"
