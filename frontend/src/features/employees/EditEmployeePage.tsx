import { useParams, useNavigate } from "react-router-dom";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import { useEmployeeQuery, useUpdateEmployeeMutation } from "./api";
import { EmployeeForm } from "./EmployeeForm";
import type { EmployeeFormValues } from "./types";

export function EditEmployeePage() {
  const { employeeId: employeeIdParam } = useParams<{ employeeId: string }>();
  const employeeId = employeeIdParam ? parseInt(employeeIdParam, 10) : 0;
  const navigate = useNavigate();

  const { data: employee, isLoading, isError } = useEmployeeQuery(employeeId);
  const updateEmployee = useUpdateEmployeeMutation(employeeId);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress aria-label="Loading employee profile" />
      </Box>
    );
  }

  if (isError || !employee) {
    return <Alert severity="error">Failed to load employee profile.</Alert>;
  }

  const handleSubmit = (values: EmployeeFormValues) => {
    updateEmployee.mutate(values, {
      onSuccess: () => navigate(`/employees/${employeeId}`),
    });
  };

  return (
    <Box>
      <Typography variant="h5" component="h1" gutterBottom>
        Edit Employee
      </Typography>
      <EmployeeForm
        mode="edit"
        initialValues={{
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          jobTitle: employee.jobTitle,
          departmentId: employee.departmentId,
          countryId: employee.countryId,
          hireDate: employee.hireDate,
          salaryAmount: employee.salaryAmount,
        }}
        onSubmit={handleSubmit}
      />
    </Box>
  );
}
