from __future__ import annotations

from app.core import reference_data
from app.core.errors import InvalidReferenceError, NotFoundError
from app.employees.models import Employee, EmployeeStatus
from app.employees.repository import EmployeeRepository, SalaryRow
from app.employees.schemas import EmployeeCreate, EmployeeUpdate

ALLOWED_SORT_COLUMNS: frozenset[str] = frozenset(
    {"last_name", "department_id", "country_id", "salary_amount", "hire_date"}
)


def resolve_currency(country_id: str) -> str:
    return reference_data.country_by_id(country_id).currency_code


class EmployeeService:
    def __init__(self, repository: EmployeeRepository) -> None:
        self.repository = repository

    def get_employee(self, employee_id: int) -> Employee:
        employee = self.repository.get_by_id(employee_id)
        if employee is None:
            raise NotFoundError(f"employee {employee_id} not found")
        return employee

    def create_employee(self, data: EmployeeCreate) -> Employee:
        reference_data.department_by_id(data.department_id)
        currency = resolve_currency(data.country_id)

        employee = Employee(
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
            job_title=data.job_title,
            department_id=data.department_id,
            country_id=data.country_id,
            salary_amount=data.salary_amount,
            salary_currency=currency,
            hire_date=data.hire_date,
            status=EmployeeStatus.ACTIVE,
        )
        return self.repository.create(employee)

    def update_employee(self, employee_id: int, data: EmployeeUpdate) -> Employee:
        employee = self.get_employee(employee_id)
        updates = data.model_dump(exclude_unset=True)

        if "department_id" in updates:
            reference_data.department_by_id(updates["department_id"])
        if "country_id" in updates:
            updates["salary_currency"] = resolve_currency(updates["country_id"])

        for field, value in updates.items():
            setattr(employee, field, value)

        return self.repository.update(employee)

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

    def deactivate_employee(self, employee_id: int) -> Employee:
        employee = self.get_employee(employee_id)
        employee.status = EmployeeStatus.INACTIVE
        return self.repository.update(employee)

    def salary_rows_for_analytics(self, *, include_inactive: bool) -> list[SalaryRow]:
        return self.repository.salary_rows_for_analytics(include_inactive=include_inactive)
