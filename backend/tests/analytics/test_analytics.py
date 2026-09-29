from __future__ import annotations

import time

import pytest
from sqlalchemy import event

from app.core import db
from app.employees.repository import EmployeeRepository
from app.scripts.seed import generate_employees

ANALYTICS_ENDPOINTS = (
    "/api/analytics/by-department",
    "/api/analytics/by-country",
    "/api/analytics/pay-bands",
)

ALL_DEPARTMENT_IDS = [
    "engineering",
    "sales",
    "marketing",
    "finance",
    "hr",
    "operations",
    "customer_support",
    "legal",
    "product",
]

ALL_COUNTRY_IDS = ["us", "gb", "de", "fr", "in", "ca", "au", "sg", "br", "jp"]

ALL_PAY_BAND_LABELS = ["<40k", "40k-70k", "70k-100k", "100k-150k", "150k+"]


def keyed_by(rows: list[dict], key: str) -> dict[str, dict]:
    return {row[key]: row for row in rows}


def department_figures(client, **params) -> dict[str, dict]:
    response = client.get("/api/analytics/by-department", params=params)
    assert response.status_code == 200
    return keyed_by(response.json(), "department_id")


def country_figures(client, **params) -> dict[str, dict]:
    response = client.get("/api/analytics/by-country", params=params)
    assert response.status_code == 200
    return keyed_by(response.json(), "country_id")


def pay_band_headcounts(client, **params) -> dict[str, int]:
    response = client.get("/api/analytics/pay-bands", params=params)
    assert response.status_code == 200
    return {bucket["label"]: bucket["headcount"] for bucket in response.json()}


def test_a_department_paid_in_one_currency_reports_native_figures_in_that_currency(client, hire):
    hire(email="a@example.com", department_id="sales", country_id="gb", salary_amount="40000.00")
    hire(email="b@example.com", department_id="sales", country_id="gb", salary_amount="45000.00")
    hire(email="c@example.com", department_id="sales", country_id="gb", salary_amount="80000.00")

    sales = department_figures(client)["sales"]

    assert sales["department_name"] == "Sales"
    assert sales["currency"] == "GBP"
    assert sales["headcount"] == 3
    assert sales["avg_salary"] == "55000.00"
    assert sales["median_salary"] == "45000.00"
    assert sales["min_salary"] == "40000.00"
    assert sales["max_salary"] == "80000.00"


def test_a_department_spanning_two_countries_that_share_a_currency_stays_in_that_currency(
    client, hire
):
    hire(email="a@example.com", department_id="marketing", country_id="de", salary_amount="50000.00")
    hire(email="b@example.com", department_id="marketing", country_id="fr", salary_amount="70000.00")

    marketing = department_figures(client)["marketing"]

    assert marketing["currency"] == "EUR"
    assert marketing["avg_salary"] == "60000.00"
    assert marketing["min_salary"] == "50000.00"
    assert marketing["max_salary"] == "70000.00"


def test_a_department_paid_in_several_currencies_reports_usd_figures_from_converted_salaries(
    client, hire
):
    hire(email="a@example.com", department_id="engineering", country_id="us", salary_amount="100000.00")
    hire(email="b@example.com", department_id="engineering", country_id="de", salary_amount="50000.00")
    hire(email="c@example.com", department_id="engineering", country_id="fr", salary_amount="80000.00")

    engineering = department_figures(client)["engineering"]

    assert engineering["currency"] == "USD"
    assert engineering["headcount"] == 3
    assert engineering["avg_salary"] == "80566.67"
    assert engineering["median_salary"] == "87200.00"
    assert engineering["min_salary"] == "54500.00"
    assert engineering["max_salary"] == "100000.00"


def test_country_figures_are_always_reported_in_the_countrys_native_currency(client, hire):
    hire(email="a@example.com", department_id="engineering", country_id="de", salary_amount="50000.00")
    hire(email="b@example.com", department_id="sales", country_id="de", salary_amount="70000.00")
    hire(email="c@example.com", department_id="engineering", country_id="us", salary_amount="100000.00")

    countries = country_figures(client)

    germany = countries["de"]
    assert germany["country_name"] == "Germany"
    assert germany["currency"] == "EUR"
    assert germany["headcount"] == 2
    assert germany["avg_salary"] == "60000.00"
    assert germany["median_salary"] == "60000.00"
    assert germany["min_salary"] == "50000.00"
    assert germany["max_salary"] == "70000.00"
    assert countries["us"]["currency"] == "USD"
    assert countries["us"]["avg_salary"] == "100000.00"


def test_pay_bands_count_employees_by_usd_converted_salary_with_band_floors_inclusive(
    client, hire
):
    hire(email="a@example.com", department_id="sales", country_id="us", salary_amount="39999.99")
    hire(email="b@example.com", department_id="sales", country_id="us", salary_amount="40000.00")
    hire(email="c@example.com", department_id="sales", country_id="in", salary_amount="5000000.00")
    hire(email="d@example.com", department_id="sales", country_id="de", salary_amount="64300.00")
    hire(email="e@example.com", department_id="sales", country_id="jp", salary_amount="20000000.00")
    hire(email="f@example.com", department_id="sales", country_id="us", salary_amount="150000.00")

    response = client.get("/api/analytics/pay-bands")

    assert response.status_code == 200
    assert response.json() == [
        {"label": "<40k", "headcount": 1},
        {"label": "40k-70k", "headcount": 2},
        {"label": "70k-100k", "headcount": 1},
        {"label": "100k-150k", "headcount": 1},
        {"label": "150k+", "headcount": 1},
    ]


def test_a_deactivated_employee_drops_out_of_default_analytics_and_returns_when_inactive_is_included(
    client, hire
):
    hire(email="stays@example.com", department_id="engineering", country_id="us", salary_amount="60000.00")
    leaver = hire(
        email="leaves@example.com", department_id="engineering", country_id="us", salary_amount="100000.00"
    )
    assert client.post(f"/api/employees/{leaver}/deactivate").status_code == 200

    default_engineering = department_figures(client)["engineering"]
    default_us = country_figures(client)["us"]
    default_bands = pay_band_headcounts(client)
    all_engineering = department_figures(client, includeInactive="true")["engineering"]
    all_us = country_figures(client, includeInactive="true")["us"]
    all_bands = pay_band_headcounts(client, includeInactive="true")

    assert default_engineering["headcount"] == 1
    assert default_engineering["avg_salary"] == "60000.00"
    assert default_us["headcount"] == 1
    assert default_us["max_salary"] == "60000.00"
    assert default_bands["100k-150k"] == 0
    assert all_engineering["headcount"] == 2
    assert all_engineering["avg_salary"] == "80000.00"
    assert all_us["headcount"] == 2
    assert all_us["max_salary"] == "100000.00"
    assert all_bands["100k-150k"] == 1


def test_a_department_and_a_country_with_no_current_employees_still_appear_at_zero(client, hire):
    hire(email="a@example.com", department_id="engineering", country_id="us", salary_amount="90000.00")

    legal = department_figures(client)["legal"]
    japan = country_figures(client)["jp"]

    assert legal == {
        "department_id": "legal",
        "department_name": "Legal",
        "currency": "USD",
        "headcount": 0,
        "avg_salary": "0.00",
        "median_salary": "0.00",
        "min_salary": "0.00",
        "max_salary": "0.00",
    }
    assert japan["currency"] == "JPY"
    assert japan["headcount"] == 0
    assert japan["avg_salary"] == "0.00"


def test_analytics_over_an_empty_organisation_reports_every_group_and_band_at_zero(client):
    departments = client.get("/api/analytics/by-department").json()
    countries = client.get("/api/analytics/by-country").json()
    bands = client.get("/api/analytics/pay-bands").json()

    assert [row["department_id"] for row in departments] == ALL_DEPARTMENT_IDS
    assert {row["headcount"] for row in departments} == {0}
    assert [row["country_id"] for row in countries] == ALL_COUNTRY_IDS
    assert {row["headcount"] for row in countries} == {0}
    assert [bucket["label"] for bucket in bands] == ALL_PAY_BAND_LABELS
    assert {bucket["headcount"] for bucket in bands} == {0}


@pytest.fixture
def seeded_organisation(client, in_memory_engine):
    session = db.SessionLocal()
    try:
        EmployeeRepository(session).bulk_insert(generate_employees(count=10_000, seed=42))
    finally:
        session.close()
    return in_memory_engine


@pytest.fixture
def statements_issued(seeded_organisation):
    statements: list[str] = []

    def record(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    event.listen(seeded_organisation, "before_cursor_execute", record)
    yield statements
    event.remove(seeded_organisation, "before_cursor_execute", record)


@pytest.mark.parametrize("endpoint", ANALYTICS_ENDPOINTS)
def test_each_analytics_view_over_the_full_organisation_answers_in_one_query_within_two_seconds(
    client, statements_issued, endpoint
):
    started = time.perf_counter()
    response = client.get(endpoint)
    elapsed_seconds = time.perf_counter() - started

    assert response.status_code == 200
    assert len(statements_issued) == 1
    assert elapsed_seconds < 2
