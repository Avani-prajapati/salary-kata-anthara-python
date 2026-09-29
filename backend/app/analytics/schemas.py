from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel


class DepartmentAggregate(BaseModel):
    department_id: str
    department_name: str
    currency: str
    headcount: int
    avg_salary: Decimal
    median_salary: Decimal
    min_salary: Decimal
    max_salary: Decimal


class CountryAggregate(BaseModel):
    country_id: str
    country_name: str
    currency: str
    headcount: int
    avg_salary: Decimal
    median_salary: Decimal
    min_salary: Decimal
    max_salary: Decimal


class PayBandBucket(BaseModel):
    label: str
    headcount: int
