from __future__ import annotations

from app.core.errors import InvalidReferenceError, NotFoundError
from app.employees.models import Employee, EmployeeStatus
from app.employees.repository import EmployeeRepository

ALLOWED_SORT_COLUMNS: frozenset[str] = frozenset(
    {"last_name", "department_id", "country_id", "salary_amount", "hire_date"}
)


class EmployeeService:
    def __init__(self, repository: EmployeeRepository) -> None:
        self.repository = repository

    def get_employee(self, employee_id: int) -> Employee:
        employee = self.repository.get_by_id(employee_id)
        if employee is None:
            raise NotFoundError(f"employee {employee_id} not found")
        return employee

    def list_employees(
        self,
        *,
        page: int,
        page_size: int,
        sort_by: str,
        sort_dir: str,
        q: str | None = None,
        department_id: str | None = None,
        country_id: str | None = None,
        status: EmployeeStatus | None = None,
    ) -> tuple[list[Employee], int]:
        if sort_by not in ALLOWED_SORT_COLUMNS:
            raise InvalidReferenceError(f"unsupported sort column: {sort_by!r}")

        return self.repository.list(
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_dir=sort_dir,
            q=q,
            department_id=department_id,
            country_id=country_id,
            status=status,
        )
