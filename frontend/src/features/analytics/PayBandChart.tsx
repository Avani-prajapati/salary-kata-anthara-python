import { Box, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import { BarChart } from "@mui/x-charts/BarChart";
import type { PayBandBucket } from "./types";

const CHART_HEIGHT = 300;
const CHART_TITLE = "Pay-band distribution (USD-normalized)";

export function PayBandChart({ buckets }: Readonly<{ buckets: PayBandBucket[] }>) {
  return (
    <Box>
      <Box aria-hidden="true">
        <BarChart
          height={CHART_HEIGHT}
          xAxis={[{ scaleType: "band", data: buckets.map((bucket) => bucket.label) }]}
          series={[{ data: buckets.map((bucket) => bucket.headcount), label: "Employees" }]}
        />
      </Box>
      <Table sx={visuallyHidden} aria-label={CHART_TITLE}>
        <TableHead>
          <TableRow>
            <TableCell>Pay band (USD)</TableCell>
            <TableCell>Headcount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {buckets.map((bucket) => (
            <TableRow key={bucket.label}>
              <TableCell>{bucket.label}</TableCell>
              <TableCell>{bucket.headcount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
