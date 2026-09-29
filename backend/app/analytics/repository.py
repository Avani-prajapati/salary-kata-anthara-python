from __future__ import annotations

from collections import defaultdict
from decimal import Decimal
from typing import Literal

from app.employees.service import EmployeeService

Salary = tuple[Decimal, str]


class AnalyticsRepository:
    def __init__(self, employee_service: EmployeeService) -> None:
        self.employee_service = employee_service

    def salaries_grouped_by(
        self,
        *,
        group_column: Literal["department_id", "country_id"],
        include_inactive: bool,
    ) -> dict[str, list[Salary]]:
        group_index = 0 if group_column == "department_id" else 1
        salaries_by_group: dict[str, list[Salary]] = defaultdict(list)
        for row in self._salary_rows(include_inactive=include_inactive):
            salaries_by_group[row[group_index]].append((row[2], row[3]))
        return dict(salaries_by_group)

    def all_salaries(self, *, include_inactive: bool) -> list[Salary]:
        return [
            (row[2], row[3]) for row in self._salary_rows(include_inactive=include_inactive)
        ]

    def _salary_rows(
        self, *, include_inactive: bool
    ) -> list[tuple[str, str, Decimal, str]]:
        return self.employee_service.salary_rows_for_analytics(include_inactive=include_inactive)
