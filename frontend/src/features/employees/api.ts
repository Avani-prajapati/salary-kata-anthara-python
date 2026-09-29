import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost, type ApiError } from "../../shared/api/client";
import type { Employee, EmployeeFormValues, EmployeeStatus, Page } from "./types";

export type EmployeeSortField = "lastName" | "departmentId" | "countryId" | "salaryAmount" | "hireDate";

const SORT_FIELD_TO_WIRE_COLUMN: Record<EmployeeSortField, string> = {
  lastName: "last_name",
  departmentId: "department_id",
  countryId: "country_id",
  salaryAmount: "salary_amount",
  hireDate: "hire_date",
};

interface EmployeeWire {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  department_id: string;
  country_id: string;
  salary_amount: string;
  salary_currency: string;
  hire_date: string;
  status: Employee["status"];
}

interface PageWire<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

function mapEmployee(wire: EmployeeWire): Employee {
  return {
    id: wire.id,
    firstName: wire.first_name,
    lastName: wire.last_name,
    email: wire.email,
    jobTitle: wire.job_title,
    departmentId: wire.department_id,
    countryId: wire.country_id,
    salaryAmount: wire.salary_amount,
    salaryCurrency: wire.salary_currency,
    hireDate: wire.hire_date,
    status: wire.status,
  };
}

export interface EmployeesQueryParams {
  page: number;
  pageSize: number;
  sortBy: EmployeeSortField;
  sortDir: "asc" | "desc";
  q?: string;
  departmentId?: string;
  countryId?: string;
  status?: EmployeeStatus;
}

export function useEmployeesQuery(params: EmployeesQueryParams): UseQueryResult<Page<Employee>> {
  return useQuery({
    queryKey: ["employees", params],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const queryParams: Record<string, string | number> = {
        page: params.page,
        pageSize: params.pageSize,
        sortBy: SORT_FIELD_TO_WIRE_COLUMN[params.sortBy],
        sortDir: params.sortDir,
      };

      if (params.q) queryParams.q = params.q;
      if (params.departmentId) queryParams.departmentId = params.departmentId;
      if (params.countryId) queryParams.countryId = params.countryId;
      if (params.status) queryParams.status = params.status;

      const wire = await apiGet<PageWire<EmployeeWire>>("/api/employees", queryParams);

      return {
        items: wire.items.map(mapEmployee),
        total: wire.total,
        page: wire.page,
        pageSize: wire.page_size,
      };
    },
  });
}

export function useEmployeeQuery(employeeId: number): UseQueryResult<Employee> {
  return useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => {
      const wire = await apiGet<EmployeeWire>(`/api/employees/${employeeId}`);
      return mapEmployee(wire);
    },
  });
}

function toEmployeeCreateWire(values: EmployeeFormValues) {
  return {
    first_name: values.firstName,
    last_name: values.lastName,
    email: values.email,
    job_title: values.jobTitle,
    department_id: values.departmentId,
    country_id: values.countryId,
    hire_date: values.hireDate,
    salary_amount: values.salaryAmount,
  };
}

export function useCreateEmployeeMutation(): UseMutationResult<Employee, ApiError, EmployeeFormValues> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: EmployeeFormValues) => {
      const wire = await apiPost<EmployeeWire>("/api/employees", toEmployeeCreateWire(values));
      return mapEmployee(wire);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

const EMPLOYEE_FIELD_TO_WIRE_KEY: Record<keyof EmployeeFormValues, string> = {
  firstName: "first_name",
  lastName: "last_name",
  email: "email",
  jobTitle: "job_title",
  departmentId: "department_id",
  countryId: "country_id",
  hireDate: "hire_date",
  salaryAmount: "salary_amount",
};

function toEmployeeUpdateWire(values: Partial<EmployeeFormValues>): Record<string, string> {
  const wire: Record<string, string> = {};
  for (const [field, value] of Object.entries(values)) {
    if (value === undefined) continue;
    wire[EMPLOYEE_FIELD_TO_WIRE_KEY[field as keyof EmployeeFormValues]] = value;
  }
  return wire;
}

export function useUpdateEmployeeMutation(
  employeeId: number,
): UseMutationResult<Employee, ApiError, Partial<EmployeeFormValues>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: Partial<EmployeeFormValues>) => {
      const wire = await apiPatch<EmployeeWire>(
        `/api/employees/${employeeId}`,
        toEmployeeUpdateWire(values),
      );
      return mapEmployee(wire);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useDeactivateEmployeeMutation(
  employeeId: number,
): UseMutationResult<Employee, ApiError, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const wire = await apiPost<EmployeeWire>(`/api/employees/${employeeId}/deactivate`, {});
      return mapEmployee(wire);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}
