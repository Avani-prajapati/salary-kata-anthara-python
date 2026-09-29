import { useState } from "react";
import { Alert, Box, Typography } from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridSortModel,
  type GridValueGetterParams,
} from "@mui/x-data-grid";
import { useEmployeesQuery, type EmployeeSortField } from "./api";
import type { Employee } from "./types";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const DEFAULT_PAGINATION_MODEL: GridPaginationModel = { page: 0, pageSize: 50 };
const DEFAULT_SORT_MODEL: GridSortModel = [{ field: "lastName", sort: "asc" }];

const COLUMNS: GridColDef<Employee>[] = [
  {
    field: "lastName",
    headerName: "Name",
    flex: 1,
    valueGetter: (params: GridValueGetterParams<Employee>) =>
      `${params.row.firstName} ${params.row.lastName}`,
  },
  { field: "departmentId", headerName: "Department", flex: 1 },
  { field: "countryId", headerName: "Country", flex: 1 },
  { field: "jobTitle", headerName: "Title", flex: 1, sortable: false },
  {
    field: "salaryAmount",
    headerName: "Salary",
    flex: 1,
    valueGetter: (params: GridValueGetterParams<Employee>) =>
      `${params.row.salaryAmount} ${params.row.salaryCurrency}`,
  },
  { field: "status", headerName: "Status", flex: 1, sortable: false },
];

export function DirectoryPage() {
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>(DEFAULT_PAGINATION_MODEL);
  const [sortModel, setSortModel] = useState<GridSortModel>(DEFAULT_SORT_MODEL);

  const activeSort = sortModel[0];

  const { data, isLoading, isError } = useEmployeesQuery({
    page: paginationModel.page + 1,
    pageSize: paginationModel.pageSize,
    sortBy: (activeSort?.field ?? "lastName") as EmployeeSortField,
    sortDir: activeSort?.sort === "desc" ? "desc" : "asc",
  });

  return (
    <Box>
      <Typography variant="h5" component="h1" gutterBottom>
        Employee Directory
      </Typography>
      {isError ? <Alert severity="error">Failed to load employees.</Alert> : null}
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <DataGrid
          autoHeight
          rows={data?.items ?? []}
          rowCount={data?.total ?? 0}
          columns={COLUMNS}
          getRowId={(row) => row.id}
          loading={isLoading}
          paginationMode="server"
          sortingMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          sortModel={sortModel}
          onSortModelChange={setSortModel}
        />
      </Box>
    </Box>
  );
}
