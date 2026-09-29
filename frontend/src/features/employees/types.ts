export type EmployeeStatus = "active" | "inactive";

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  departmentId: string;
  countryId: string;
  salaryAmount: string;
  salaryCurrency: string;
  hireDate: string;
  status: EmployeeStatus;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
