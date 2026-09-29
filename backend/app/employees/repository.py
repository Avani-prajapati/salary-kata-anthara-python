from __future__ import annotations

from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import Session

from app.employees.models import Employee


class EmployeeRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def bulk_insert(self, employees: list[Employee]) -> None:
        self.db.add_all(employees)
        self.db.commit()

    def count_all(self) -> int:
        return self.db.scalar(select(func.count()).select_from(Employee)) or 0

    def list(
        self,
        *,
        page: int,
        page_size: int,
        sort_by: str,
        sort_dir: str,
    ) -> tuple[list[Employee], int]:
        total = self.count_all()

        order_column = getattr(Employee, sort_by)
        order_clause = desc(order_column) if sort_dir == "desc" else asc(order_column)

        rows = (
            self.db.execute(
                select(Employee)
                .order_by(order_clause)
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
            .scalars()
            .all()
        )
        return list(rows), total
