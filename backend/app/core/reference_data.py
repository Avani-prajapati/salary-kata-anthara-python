from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from app.core.errors import InvalidReferenceError


@dataclass(frozen=True)
class Department:
    id: str
    name: str


@dataclass(frozen=True)
class Country:
    id: str
    name: str
    currency_code: str


@dataclass(frozen=True)
class CurrencyRate:
    code: str
    usd_rate: Decimal
    snapshot_date: date


@dataclass(frozen=True)
class PayBand:
    label: str
    min_usd: Decimal
    max_usd: Decimal | None

    def contains(self, amount_usd: Decimal) -> bool:
        is_below_ceiling = self.max_usd is None or amount_usd < self.max_usd
        return self.min_usd <= amount_usd and is_below_ceiling


DEPARTMENTS: tuple[Department, ...] = (
    Department("engineering", "Engineering"),
    Department("sales", "Sales"),
    Department("marketing", "Marketing"),
    Department("finance", "Finance"),
    Department("hr", "HR"),
    Department("operations", "Operations"),
    Department("customer_support", "Customer Support"),
    Department("legal", "Legal"),
    Department("product", "Product"),
)

COUNTRIES: tuple[Country, ...] = (
    Country("us", "United States", "USD"),
    Country("gb", "United Kingdom", "GBP"),
    Country("de", "Germany", "EUR"),
    Country("fr", "France", "EUR"),
    Country("in", "India", "INR"),
    Country("ca", "Canada", "CAD"),
    Country("au", "Australia", "AUD"),
    Country("sg", "Singapore", "SGD"),
    Country("br", "Brazil", "BRL"),
    Country("jp", "Japan", "JPY"),
)

_SNAPSHOT_DATE = date(2026, 9, 29)

CURRENCY_RATES: dict[str, CurrencyRate] = {
    rate.code: rate
    for rate in (
        CurrencyRate("USD", Decimal("1.00"), _SNAPSHOT_DATE),
        CurrencyRate("GBP", Decimal("1.27"), _SNAPSHOT_DATE),
        CurrencyRate("EUR", Decimal("1.09"), _SNAPSHOT_DATE),
        CurrencyRate("INR", Decimal("0.012"), _SNAPSHOT_DATE),
        CurrencyRate("CAD", Decimal("0.74"), _SNAPSHOT_DATE),
        CurrencyRate("AUD", Decimal("0.66"), _SNAPSHOT_DATE),
        CurrencyRate("SGD", Decimal("0.75"), _SNAPSHOT_DATE),
        CurrencyRate("BRL", Decimal("0.20"), _SNAPSHOT_DATE),
        CurrencyRate("JPY", Decimal("0.0067"), _SNAPSHOT_DATE),
    )
}

PAY_BANDS: tuple[PayBand, ...] = (
    PayBand("<40k", Decimal("0"), Decimal("40000")),
    PayBand("40k-70k", Decimal("40000"), Decimal("70000")),
    PayBand("70k-100k", Decimal("70000"), Decimal("100000")),
    PayBand("100k-150k", Decimal("100000"), Decimal("150000")),
    PayBand("150k+", Decimal("150000"), None),
)

_DEPARTMENTS_BY_ID = {department.id: department for department in DEPARTMENTS}
_COUNTRIES_BY_ID = {country.id: country for country in COUNTRIES}


def department_by_id(department_id: str) -> Department:
    try:
        return _DEPARTMENTS_BY_ID[department_id]
    except KeyError:
        raise InvalidReferenceError(f"unknown department id: {department_id!r}") from None


def country_by_id(country_id: str) -> Country:
    try:
        return _COUNTRIES_BY_ID[country_id]
    except KeyError:
        raise InvalidReferenceError(f"unknown country id: {country_id!r}") from None


def to_usd(amount: Decimal, currency_code: str) -> Decimal:
    try:
        rate = CURRENCY_RATES[currency_code]
    except KeyError:
        raise InvalidReferenceError(f"unknown currency code: {currency_code!r}") from None
    return amount * rate.usd_rate
