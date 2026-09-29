import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiGet } from "../../shared/api/client";
import type { CountryAggregate, DepartmentAggregate, PayBandBucket, SalaryFigures } from "./types";

interface SalaryFiguresWire {
  currency: string;
  headcount: number;
  avg_salary: string;
  median_salary: string;
  min_salary: string;
  max_salary: string;
}

interface DepartmentAggregateWire extends SalaryFiguresWire {
  department_id: string;
  department_name: string;
}

interface CountryAggregateWire extends SalaryFiguresWire {
  country_id: string;
  country_name: string;
}

function mapSalaryFigures(wire: SalaryFiguresWire): SalaryFigures {
  return {
    currency: wire.currency,
    headcount: wire.headcount,
    avgSalary: wire.avg_salary,
    medianSalary: wire.median_salary,
    minSalary: wire.min_salary,
    maxSalary: wire.max_salary,
  };
}

function inclusionParams(includeInactive: boolean): Record<string, string> {
  return { includeInactive: String(includeInactive) };
}

export function useDepartmentAnalyticsQuery(includeInactive: boolean): UseQueryResult<DepartmentAggregate[]> {
  return useQuery({
    queryKey: ["analytics", "by-department", includeInactive],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const wire = await apiGet<DepartmentAggregateWire[]>(
        "/api/analytics/by-department",
        inclusionParams(includeInactive),
      );
      return wire.map((row) => ({
        departmentId: row.department_id,
        departmentName: row.department_name,
        ...mapSalaryFigures(row),
      }));
    },
  });
}

export function useCountryAnalyticsQuery(includeInactive: boolean): UseQueryResult<CountryAggregate[]> {
  return useQuery({
    queryKey: ["analytics", "by-country", includeInactive],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const wire = await apiGet<CountryAggregateWire[]>(
        "/api/analytics/by-country",
        inclusionParams(includeInactive),
      );
      return wire.map((row) => ({
        countryId: row.country_id,
        countryName: row.country_name,
        ...mapSalaryFigures(row),
      }));
    },
  });
}

export function usePayBandsQuery(includeInactive: boolean): UseQueryResult<PayBandBucket[]> {
  return useQuery({
    queryKey: ["analytics", "pay-bands", includeInactive],
    placeholderData: keepPreviousData,
    queryFn: () => apiGet<PayBandBucket[]>("/api/analytics/pay-bands", inclusionParams(includeInactive)),
  });
}
