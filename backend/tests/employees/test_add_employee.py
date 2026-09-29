from __future__ import annotations


def valid_payload(**overrides):
    payload = {
        "first_name": "Ada",
        "last_name": "Lovelace",
        "email": "ada.lovelace@example.com",
        "job_title": "Senior Engineer",
        "department_id": "engineering",
        "country_id": "gb",
        "hire_date": "2024-03-01",
        "salary_amount": "95000.00",
    }
    payload.update(overrides)
    return payload


def test_a_fully_valid_payload_creates_an_employee_and_returns_its_new_id(
    client, employee_repository
):
    response = client.post("/api/employees", json=valid_payload())

    body = response.json()
    assert response.status_code == 201
    assert isinstance(body["id"], int)
    assert body["first_name"] == "Ada"
    assert body["last_name"] == "Lovelace"
    assert body["email"] == "ada.lovelace@example.com"
    assert employee_repository.count_all() == 1


def test_a_zero_salary_is_rejected_and_creates_no_row(client, employee_repository):
    response = client.post("/api/employees", json=valid_payload(salary_amount="0"))

    assert response.status_code == 422
    assert employee_repository.count_all() == 0


def test_a_negative_salary_is_rejected_and_creates_no_row(client, employee_repository):
    response = client.post("/api/employees", json=valid_payload(salary_amount="-1000"))

    assert response.status_code == 422
    assert employee_repository.count_all() == 0


def test_a_missing_required_field_returns_422_listing_every_invalid_field(
    client, employee_repository
):
    payload = valid_payload()
    del payload["department_id"]
    del payload["email"]

    response = client.post("/api/employees", json=payload)

    body = response.json()
    invalid_fields = {error["loc"][-1] for error in body["detail"]}
    assert response.status_code == 422
    assert "department_id" in invalid_fields
    assert "email" in invalid_fields
    assert employee_repository.count_all() == 0


def test_a_malformed_email_is_rejected_without_reaching_the_database(
    client, employee_repository
):
    response = client.post("/api/employees", json=valid_payload(email="not-an-email"))

    assert response.status_code == 422
    assert employee_repository.count_all() == 0


def test_an_unknown_department_id_returns_422(client, employee_repository):
    response = client.post("/api/employees", json=valid_payload(department_id="nonexistent"))

    assert response.status_code == 422
    assert employee_repository.count_all() == 0


def test_an_unknown_country_id_returns_422(client, employee_repository):
    response = client.post("/api/employees", json=valid_payload(country_id="nonexistent"))

    assert response.status_code == 422
    assert employee_repository.count_all() == 0


def test_the_created_employees_salary_currency_is_derived_from_its_country(
    client, employee_repository
):
    response = client.post("/api/employees", json=valid_payload(country_id="jp"))

    body = response.json()
    assert response.status_code == 201
    assert body["salary_currency"] == "JPY"
    assert "salary_currency" not in valid_payload()
