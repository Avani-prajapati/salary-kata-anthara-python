from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.analytics.repository import AnalyticsRepository
from app.analytics.schemas import CountryAggregate, DepartmentAggregate, PayBandBucket
from app.analytics.service import AnalyticsService
from app.core.db import get_db
from app.employees.repository import EmployeeRepository
from app.employees.service import EmployeeService

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/by-department", response_model=list[DepartmentAggregate])
def department_analytics(
    include_inactive: bool = Query(False, alias="includeInactive"),
    db: Session = Depends(get_db),
) -> list[DepartmentAggregate]:
    service = AnalyticsService(AnalyticsRepository(EmployeeService(EmployeeRepository(db))))
    return service.department_aggregates(include_inactive=include_inactive)


@router.get("/by-country", response_model=list[CountryAggregate])
def country_analytics(
    include_inactive: bool = Query(False, alias="includeInactive"),
    db: Session = Depends(get_db),
) -> list[CountryAggregate]:
    service = AnalyticsService(AnalyticsRepository(EmployeeService(EmployeeRepository(db))))
    return service.country_aggregates(include_inactive=include_inactive)


@router.get("/pay-bands", response_model=list[PayBandBucket])
def pay_band_analytics(
    include_inactive: bool = Query(False, alias="includeInactive"),
    db: Session = Depends(get_db),
) -> list[PayBandBucket]:
    service = AnalyticsService(AnalyticsRepository(EmployeeService(EmployeeRepository(db))))
    return service.pay_band_distribution(include_inactive=include_inactive)
