from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.employees.models import EmployeeStatus

T = TypeVar("T")


class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    job_title: str
    department_id: str
    country_id: str
    hire_date: date
    salary_amount: Decimal = Field(gt=0)


class EmployeeUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    job_title: str | None = None
    department_id: str | None = None
    country_id: str | None = None
    hire_date: date | None = None
    salary_amount: Decimal | None = Field(default=None, gt=0)


class EmployeeRead(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    job_title: str
    department_id: str
    country_id: str
    salary_amount: Decimal
    salary_currency: str
    hire_date: date
    status: EmployeeStatus

    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
