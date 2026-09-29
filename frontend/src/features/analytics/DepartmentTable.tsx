import { SalaryFiguresTable } from "./SalaryFiguresTable";
import type { DepartmentAggregate } from "./types";

export function DepartmentTable({ rows }: Readonly<{ rows: DepartmentAggregate[] }>) {
  return (
    <SalaryFiguresTable
      caption="Pay by department"
      groupHeader="Department"
      rows={rows.map((row) => ({ id: row.departmentId, name: row.departmentName, figures: row }))}
    />
  );
}
