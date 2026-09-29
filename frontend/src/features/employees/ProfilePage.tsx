import { Link as RouterLink, useParams } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Grid, Typography } from "@mui/material";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import { useEmployeeQuery, useDeactivateEmployeeMutation } from "./api";
import { countryName, departmentName } from "./referenceData";

function ProfileField({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Grid item xs={12} sm={6}>
      <Typography variant="subtitle2" color="textSecondary">
        {label}
      </Typography>
      <Typography variant="body1">{value}</Typography>
    </Grid>
  );
}

export function ProfilePage() {
  const { employeeId: employeeIdParam } = useParams<{ employeeId: string }>();
  const employeeId = employeeIdParam ? parseInt(employeeIdParam, 10) : 0;

  const { data: employee, isLoading, isError } = useEmployeeQuery(employeeId);
  const deactivateMutation = useDeactivateEmployeeMutation(employeeId);

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

  const handleDeactivate = () => {
    deactivateMutation.mutate();
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Employee Profile
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button component={RouterLink} to={`/employees/${employeeId}/edit`} variant="outlined">
            Edit
          </Button>
          {employee.status === "active" && (
            <Button
              variant="outlined"
              color="error"
              onClick={handleDeactivate}
              disabled={deactivateMutation.isPending}
            >
              Deactivate
            </Button>
          )}
        </Box>
      </Box>
      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <ProfileField label="First Name" value={employee.firstName} />
            <ProfileField label="Last Name" value={employee.lastName} />
            <ProfileField label="Email" value={employee.email} />
            <ProfileField label="Job Title" value={employee.jobTitle} />
            <ProfileField label="Department" value={departmentName(employee.departmentId)} />
            <ProfileField label="Country" value={countryName(employee.countryId)} />
            <ProfileField
              label="Salary"
              value={`${employee.salaryAmount} ${employee.salaryCurrency}`}
            />
            <ProfileField label="Hire Date" value={employee.hireDate} />
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Status
              </Typography>
              <StatusBadge status={employee.status} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
