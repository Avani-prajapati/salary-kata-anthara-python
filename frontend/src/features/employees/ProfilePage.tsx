import { Link as RouterLink, useParams } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Grid, Typography } from "@mui/material";
import { useEmployeeQuery } from "./api";

export function ProfilePage() {
  const { employeeId: employeeIdParam } = useParams<{ employeeId: string }>();
  const employeeId = employeeIdParam ? parseInt(employeeIdParam, 10) : 0;

  const { data: employee, isLoading, isError } = useEmployeeQuery(employeeId);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !employee) {
    return <Alert severity="error">Failed to load employee profile.</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Employee Profile
        </Typography>
        <Button component={RouterLink} to={`/employees/${employeeId}/edit`} variant="outlined">
          Edit
        </Button>
      </Box>
      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                First Name
              </Typography>
              <Typography variant="body1">{employee.firstName}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Last Name
              </Typography>
              <Typography variant="body1">{employee.lastName}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Email
              </Typography>
              <Typography variant="body1">{employee.email}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Job Title
              </Typography>
              <Typography variant="body1">{employee.jobTitle}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Department
              </Typography>
              <Typography variant="body1">{employee.departmentId}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Country
              </Typography>
              <Typography variant="body1">{employee.countryId}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Salary
              </Typography>
              <Typography variant="body1">
                {employee.salaryAmount} {employee.salaryCurrency}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Hire Date
              </Typography>
              <Typography variant="body1">{employee.hireDate}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Status
              </Typography>
              <Typography variant="body1" sx={{ textTransform: "capitalize" }}>
                {employee.status}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
