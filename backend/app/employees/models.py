from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import Enum as SqlEnum
from sqlalchemy import Numeric
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.db import Base


class EmployeeStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    first_name: Mapped[str]
    last_name: Mapped[str]
    email: Mapped[str] = mapped_column(unique=True, index=True)
    job_title: Mapped[str]
    department_id: Mapped[str] = mapped_column(index=True)
    country_id: Mapped[str] = mapped_column(index=True)
    salary_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    salary_currency: Mapped[str]
    hire_date: Mapped[date]
    status: Mapped[EmployeeStatus] = mapped_column(
        SqlEnum(EmployeeStatus, native_enum=False, length=20),
        index=True,
        default=EmployeeStatus.ACTIVE,
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
