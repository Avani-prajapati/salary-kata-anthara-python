from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core import db
from app.employees.repository import EmployeeRepository
from app.main import app


@pytest.fixture
def client(in_memory_engine):
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def employee_repository(in_memory_engine):
    session = db.SessionLocal()
    try:
        yield EmployeeRepository(session)
    finally:
        session.close()
