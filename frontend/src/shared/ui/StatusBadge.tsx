import { Chip } from "@mui/material";
import type { EmployeeStatus } from "../../features/employees/types";

export function StatusBadge(props: Readonly<{ status: EmployeeStatus }>) {
  return (
    <Chip
      label={props.status === "active" ? "Active" : "Inactive"}
      color={props.status === "active" ? "success" : "default"}
      size="small"
    />
  );
}
