from __future__ import annotations

import statistics
from decimal import ROUND_HALF_UP, Decimal
from typing import NamedTuple

from app.analytics.repository import AnalyticsRepository, Salary
from app.analytics.schemas import CountryAggregate, DepartmentAggregate, PayBandBucket
from app.core.reference_data import COUNTRIES, DEPARTMENTS, PAY_BANDS, Country, Department, to_usd

NORMALIZED_CURRENCY = "USD"
CENTS = Decimal("0.01")
ZERO = Decimal("0.00")


class SalaryStats(NamedTuple):
    avg_salary: Decimal
    median_salary: Decimal
    min_salary: Decimal
    max_salary: Decimal


NO_SALARIES = SalaryStats(ZERO, ZERO, ZERO, ZERO)


class AnalyticsService:
    def __init__(self, repository: AnalyticsRepository) -> None:
        self.repository = repository

    def department_aggregates(self, *, include_inactive: bool) -> list[DepartmentAggregate]:
        salaries_by_department = self.repository.salaries_grouped_by(
            group_column="department_id", include_inactive=include_inactive
        )
        return [
            _department_aggregate(department, salaries_by_department.get(department.id, []))
            for department in DEPARTMENTS
        ]

    def country_aggregates(self, *, include_inactive: bool) -> list[CountryAggregate]:
        salaries_by_country = self.repository.salaries_grouped_by(
            group_column="country_id", include_inactive=include_inactive
        )
        return [
            _country_aggregate(country, salaries_by_country.get(country.id, []))
            for country in COUNTRIES
        ]

    def pay_band_distribution(self, *, include_inactive: bool) -> list[PayBandBucket]:
        salaries = self.repository.all_salaries(include_inactive=include_inactive)
        amounts_usd = [to_usd(amount, currency) for amount, currency in salaries]
        return [
            PayBandBucket(
                label=band.label,
                headcount=sum(1 for amount in amounts_usd if band.contains(amount)),
            )
            for band in PAY_BANDS
        ]


def _department_aggregate(department: Department, salaries: list[Salary]) -> DepartmentAggregate:
    currency, amounts = _in_shared_currency(salaries)
    return DepartmentAggregate(
        department_id=department.id,
        department_name=department.name,
        currency=currency,
        headcount=len(amounts),
        **_stats(amounts)._asdict(),
    )


def _in_shared_currency(salaries: list[Salary]) -> tuple[str, list[Decimal]]:
    currencies = {currency for _, currency in salaries}
    if len(currencies) == 1:
        return currencies.pop(), [amount for amount, _ in salaries]
    return NORMALIZED_CURRENCY, [to_usd(amount, currency) for amount, currency in salaries]


def _country_aggregate(country: Country, salaries: list[Salary]) -> CountryAggregate:
    amounts = [amount for amount, _ in salaries]
    return CountryAggregate(
        country_id=country.id,
        country_name=country.name,
        currency=country.currency_code,
        headcount=len(amounts),
        **_stats(amounts)._asdict(),
    )


def _stats(values: list[Decimal]) -> SalaryStats:
    if not values:
        return NO_SALARIES
    return SalaryStats(
        avg_salary=_to_cents(statistics.mean(values)),
        median_salary=_to_cents(statistics.median(values)),
        min_salary=_to_cents(min(values)),
        max_salary=_to_cents(max(values)),
    )


def _to_cents(amount: Decimal) -> Decimal:
    return amount.quantize(CENTS, rounding=ROUND_HALF_UP)
