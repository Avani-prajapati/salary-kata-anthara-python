import { SalaryFiguresTable } from "./SalaryFiguresTable";
import type { CountryAggregate } from "./types";

export function CountryTable({ rows }: Readonly<{ rows: CountryAggregate[] }>) {
  return (
    <SalaryFiguresTable
      caption="Pay by country"
      groupHeader="Country"
      rows={rows.map((row) => ({ id: row.countryId, name: row.countryName, figures: row }))}
    />
  );
}
