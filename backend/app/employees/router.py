from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.employees.repository import EmployeeRepository
from app.employees.schemas import EmployeeRead, Page
from app.employees.service import EmployeeService

router = APIRouter(prefix="/api/employees", tags=["employees"])


@router.get("", response_model=Page[EmployeeRead])
def list_employees(
    page: int = 1,
    page_size: int = Query(50, alias="pageSize"),
    sort_by: str = Query("last_name", alias="sortBy"),
    sort_dir: Literal["asc", "desc"] = Query("asc", alias="sortDir"),
    db: Session = Depends(get_db),
) -> Page[EmployeeRead]:
    service = EmployeeService(EmployeeRepository(db))
    employees, total = service.list_employees(
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )
    return Page[EmployeeRead](
        items=[EmployeeRead.model_validate(employee) for employee in employees],
        total=total,
        page=page,
        page_size=page_size,
    )
