from __future__ import annotations

from sqlalchemy import func, select
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
