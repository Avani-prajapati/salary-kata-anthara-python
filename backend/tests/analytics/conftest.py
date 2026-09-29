from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client(in_memory_engine):
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def hire(client):
    def hire_employee(*, email: str, department_id: str, country_id: str, salary_amount: str) -> int:
        response = client.post(
            "/api/employees",
            json={
                "first_name": "Test",
                "last_name": "Employee",
                "email": email,
                "job_title": "Analyst",
                "department_id": department_id,
                "country_id": country_id,
                "hire_date": "2024-01-15",
                "salary_amount": salary_amount,
            },
        )
        assert response.status_code == 201
        return response.json()["id"]

    return hire_employee
