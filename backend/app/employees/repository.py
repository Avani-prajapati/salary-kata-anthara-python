from __future__ import annotations

from decimal import Decimal

from sqlalchemy import and_, asc, desc, func, or_, select
from sqlalchemy.orm import Session

from app.employees.models import Employee, EmployeeStatus

SalaryRow = tuple[str, str, Decimal, str]


class EmployeeRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def bulk_insert(self, employees: list[Employee]) -> None:
        self.db.add_all(employees)
        self.db.commit()

    def count_all(self) -> int:
        return self.db.scalar(select(func.count()).select_from(Employee)) or 0

    def get_by_id(self, employee_id: int) -> Employee | None:
        return self.db.scalar(select(Employee).where(Employee.id == employee_id))

    def create(self, employee: Employee) -> Employee:
        self.db.add(employee)
        self.db.commit()
        self.db.refresh(employee)
        return employee

    def update(self, employee: Employee) -> Employee:
        self.db.commit()
        self.db.refresh(employee)
        return employee

    def list(
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
        query = select(Employee)

        filters = []
        if q:
            q_lower = q.lower()
            filters.append(
                or_(
                    func.lower(Employee.first_name).contains(q_lower),
                    func.lower(Employee.last_name).contains(q_lower),
                    func.lower(Employee.email).contains(q_lower),
                )
            )
        if department_id is not None:
            filters.append(Employee.department_id == department_id)
        if country_id is not None:
            filters.append(Employee.country_id == country_id)
        if status is not None:
            filters.append(Employee.status == status)

        if filters:
            query = query.where(and_(*filters))

        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0

        order_column = getattr(Employee, sort_by)
        order_clause = desc(order_column) if sort_dir == "desc" else asc(order_column)

        rows = (
            self.db.execute(
                query.order_by(order_clause)
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
            .scalars()
            .all()
        )
        return list(rows), total

    def salary_rows_for_analytics(self, *, include_inactive: bool) -> list[SalaryRow]:
        query = select(
            Employee.department_id,
            Employee.country_id,
            Employee.salary_amount,
            Employee.salary_currency,
        )
        if not include_inactive:
            query = query.where(Employee.status == EmployeeStatus.ACTIVE)
        return [tuple(row) for row in self.db.execute(query)]
