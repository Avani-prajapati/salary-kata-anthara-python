import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import type { SalaryFigures } from "./types";

export interface SalaryFiguresRow {
  id: string;
  name: string;
  figures: SalaryFigures;
}

interface SalaryFiguresTableProps {
  caption: string;
  groupHeader: string;
  rows: SalaryFiguresRow[];
}

function asMoney(amount: string, currency: string): string {
  return `${amount} ${currency}`;
}

export function SalaryFiguresTable({ caption, groupHeader, rows }: Readonly<SalaryFiguresTableProps>) {
  return (
    <TableContainer sx={{ overflowX: "auto" }}>
      <Table size="small" aria-label={caption}>
        <TableHead>
          <TableRow>
            <TableCell>{groupHeader}</TableCell>
            <TableCell align="right">Headcount</TableCell>
            <TableCell align="right">Average</TableCell>
            <TableCell align="right">Median</TableCell>
            <TableCell align="right">Min</TableCell>
            <TableCell align="right">Max</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(({ id, name, figures }) => (
            <TableRow key={id}>
              <TableCell component="th" scope="row">
                {name}
              </TableCell>
              <TableCell align="right">{figures.headcount}</TableCell>
              <TableCell align="right">{asMoney(figures.avgSalary, figures.currency)}</TableCell>
              <TableCell align="right">{asMoney(figures.medianSalary, figures.currency)}</TableCell>
              <TableCell align="right">{asMoney(figures.minSalary, figures.currency)}</TableCell>
              <TableCell align="right">{asMoney(figures.maxSalary, figures.currency)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
