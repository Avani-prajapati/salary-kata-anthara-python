from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.employees.models import EmployeeStatus
from app.employees.repository import EmployeeRepository
from app.employees.schemas import EmployeeCreate, EmployeeRead, Page
from app.employees.service import EmployeeService

router = APIRouter(prefix="/api/employees", tags=["employees"])


@router.get("", response_model=Page[EmployeeRead])
def list_employees(
    page: int = 1,
    page_size: int = Query(50, alias="pageSize"),
    sort_by: str = Query("last_name", alias="sortBy"),
    sort_dir: Literal["asc", "desc"] = Query("asc", alias="sortDir"),
    q: str | None = None,
    department_id: str | None = Query(None, alias="departmentId"),
    country_id: str | None = Query(None, alias="countryId"),
    status: EmployeeStatus | None = None,
    db: Session = Depends(get_db),
) -> Page[EmployeeRead]:
    service = EmployeeService(EmployeeRepository(db))
    employees, total = service.list_employees(
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_dir=sort_dir,
        q=q,
        department_id=department_id,
        country_id=country_id,
        status=status,
    )
    return Page[EmployeeRead](
        items=[EmployeeRead.model_validate(employee) for employee in employees],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{employee_id}", response_model=EmployeeRead)
def get_employee(employee_id: int, db: Session = Depends(get_db)) -> EmployeeRead:
    service = EmployeeService(EmployeeRepository(db))
    employee = service.get_employee(employee_id)
    return EmployeeRead.model_validate(employee)


@router.post("", response_model=EmployeeRead, status_code=201)
def create_employee(payload: EmployeeCreate, db: Session = Depends(get_db)) -> EmployeeRead:
    service = EmployeeService(EmployeeRepository(db))
    employee = service.create_employee(payload)
    return EmployeeRead.model_validate(employee)
