import { useState } from "react";
import { Alert, Box, CircularProgress, FormControlLabel, Paper, Stack, Switch, Typography } from "@mui/material";
import { useCountryAnalyticsQuery, useDepartmentAnalyticsQuery, usePayBandsQuery } from "./api";
import { CountryTable } from "./CountryTable";
import { DepartmentTable } from "./DepartmentTable";
import { PayBandChart } from "./PayBandChart";

function describeScope(includeInactive: boolean): string {
  return includeInactive ? "active and inactive employees" : "active employees only";
}

export function AnalyticsPage() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const departments = useDepartmentAnalyticsQuery(includeInactive);
  const countries = useCountryAnalyticsQuery(includeInactive);
  const payBands = usePayBandsQuery(includeInactive);

  const queries = [departments, countries, payBands];
  const hasFailed = queries.some((query) => query.isError);
  const headcount = departments.data?.reduce((total, row) => total + row.headcount, 0);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
          Pay analytics
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.target.checked)}
            />
          }
          label="Include inactive employees"
        />
      </Stack>
      <Typography variant="subtitle1" aria-live="polite">
        Figures cover {describeScope(includeInactive)}
        {headcount !== undefined && ` · Headcount: ${headcount.toLocaleString()}`}
      </Typography>
      {hasFailed && <Alert severity="error">Analytics could not be loaded. Please try again.</Alert>}
      {departments.isPending && <CircularProgress aria-label="Loading analytics" />}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
        <Paper sx={{ padding: 2, minWidth: 0 }}>
          <Typography variant="h6" component="h2">
            By department
          </Typography>
          {departments.data && <DepartmentTable rows={departments.data} />}
        </Paper>
        <Paper sx={{ padding: 2, minWidth: 0 }}>
          <Typography variant="h6" component="h2">
            By country
          </Typography>
          {countries.data && <CountryTable rows={countries.data} />}
        </Paper>
      </Box>
      <Paper sx={{ padding: 2 }}>
        <Typography variant="h6" component="h2">
          Pay-band distribution (USD-normalized)
        </Typography>
        {payBands.data && <PayBandChart buckets={payBands.data} />}
      </Paper>
    </Stack>
  );
}
