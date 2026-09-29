import { Chip } from "@mui/material";

export function StatusBadge(props: Readonly<{ status: "active" | "inactive" }>) {
  return (
    <Chip
      label={props.status === "active" ? "Active" : "Inactive"}
      color={props.status === "active" ? "success" : "default"}
      size="small"
    />
  );
}
