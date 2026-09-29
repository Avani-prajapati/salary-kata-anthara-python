import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useCreateEmployeeMutation } from "./api";
import { EmployeeForm } from "./EmployeeForm";
import type { EmployeeFormValues } from "./types";

export function AddEmployeePage() {
  const navigate = useNavigate();
  const createEmployee = useCreateEmployeeMutation();

  const handleSubmit = (values: EmployeeFormValues) => {
    createEmployee.mutate(values, {
      onSuccess: (employee) => navigate(`/employees/${employee.id}`),
    });
  };

  return (
    <Box>
      <Typography variant="h5" component="h1" gutterBottom>
        Add Employee
      </Typography>
      <EmployeeForm mode="add" onSubmit={handleSubmit} />
    </Box>
  );
}
