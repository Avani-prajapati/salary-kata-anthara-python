from __future__ import annotations

from collections import defaultdict
from decimal import Decimal
from typing import Literal

from sqlalchemy import Select, Table, select
from sqlalchemy.orm import Session

from app.core.db import Base

EMPLOYEES_TABLE_NAME = "employees"
ACTIVE_STATUS = "active"

Salary = tuple[Decimal, str]


class AnalyticsRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def salaries_grouped_by(
        self,
        *,
        group_column: Literal["department_id", "country_id"],
        include_inactive: bool,
    ) -> dict[str, list[Salary]]:
        employees = _employees_table()
        query = select(
            employees.c[group_column], employees.c.salary_amount, employees.c.salary_currency
        )
        salaries_by_group: dict[str, list[Salary]] = defaultdict(list)
        for group_id, amount, currency in self.db.execute(_restrict(query, include_inactive)):
            salaries_by_group[group_id].append((amount, currency))
        return dict(salaries_by_group)

    def all_salaries(self, *, include_inactive: bool) -> list[Salary]:
        employees = _employees_table()
        query = select(employees.c.salary_amount, employees.c.salary_currency)
        rows = self.db.execute(_restrict(query, include_inactive))
        return [(amount, currency) for amount, currency in rows]


def _employees_table() -> Table:
    return Base.metadata.tables[EMPLOYEES_TABLE_NAME]


def _restrict(query: Select, include_inactive: bool) -> Select:
    if include_inactive:
        return query
    return query.where(_employees_table().c.status == ACTIVE_STATUS)
