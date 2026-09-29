import type { EmployeeStatus } from "./types";

export const DEPARTMENTS: Array<{ id: string; name: string }> = [
  { id: "engineering", name: "Engineering" },
  { id: "sales", name: "Sales" },
  { id: "marketing", name: "Marketing" },
  { id: "finance", name: "Finance" },
  { id: "hr", name: "HR" },
  { id: "operations", name: "Operations" },
  { id: "customer_support", name: "Customer Support" },
  { id: "legal", name: "Legal" },
  { id: "product", name: "Product" },
];

export const COUNTRIES: Array<{ id: string; name: string }> = [
  { id: "us", name: "United States" },
  { id: "gb", name: "United Kingdom" },
  { id: "de", name: "Germany" },
  { id: "fr", name: "France" },
  { id: "in", name: "India" },
  { id: "ca", name: "Canada" },
  { id: "au", name: "Australia" },
  { id: "sg", name: "Singapore" },
  { id: "br", name: "Brazil" },
  { id: "jp", name: "Japan" },
];

export const STATUSES: Array<{ id: EmployeeStatus; name: string }> = [
  { id: "active", name: "Active" },
  { id: "inactive", name: "Inactive" },
];

export function departmentName(departmentId: string): string {
  return DEPARTMENTS.find((department) => department.id === departmentId)?.name ?? departmentId;
}

export function countryName(countryId: string): string {
  return COUNTRIES.find((country) => country.id === countryId)?.name ?? countryId;
}
