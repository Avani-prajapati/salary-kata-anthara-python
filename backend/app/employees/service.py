from __future__ import annotations

from app.core.errors import InvalidReferenceError
from app.employees.models import Employee
from app.employees.repository import EmployeeRepository

ALLOWED_SORT_COLUMNS: frozenset[str] = frozenset(
    {"last_name", "department_id", "country_id", "salary_amount", "hire_date"}
)


class EmployeeService:
    def __init__(self, repository: EmployeeRepository) -> None:
        self.repository = repository

    def list_employees(
        self,
        *,
        page: int,
        page_size: int,
        sort_by: str,
        sort_dir: str,
    ) -> tuple[list[Employee], int]:
        if sort_by not in ALLOWED_SORT_COLUMNS:
            raise InvalidReferenceError(f"unsupported sort column: {sort_by!r}")

        return self.repository.list(
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_dir=sort_dir,
        )
