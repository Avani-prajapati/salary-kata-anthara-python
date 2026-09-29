import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridEventListener,
  type GridPaginationModel,
  type GridRowParams,
  type GridRenderCellParams,
  type GridSortModel,
  type GridValueGetterParams,
} from "@mui/x-data-grid";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import { FilterBar, type FilterState } from "./FilterBar";
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
  {
    field: "status",
    headerName: "Status",
    flex: 1,
    sortable: false,
    renderCell: (params: GridRenderCellParams<Employee>) => (
      <StatusBadge status={params.row.status} />
    ),
  },
];

export function DirectoryPage() {
  const navigate = useNavigate();
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>(DEFAULT_PAGINATION_MODEL);
  const [sortModel, setSortModel] = useState<GridSortModel>(DEFAULT_SORT_MODEL);
  const [filters, setFilters] = useState<FilterState>({});

  const activeSort = sortModel[0];

  const handleRowClick: GridEventListener<"rowClick"> = (params: GridRowParams<Employee>) => {
    navigate(`/employees/${params.row.id}`);
  };

  const { data, isLoading, isError } = useEmployeesQuery({
    page: paginationModel.page + 1,
    pageSize: paginationModel.pageSize,
    sortBy: (activeSort?.field ?? "lastName") as EmployeeSortField,
    sortDir: activeSort?.sort === "desc" ? "desc" : "asc",
    q: filters.q,
    departmentId: filters.departmentId,
    countryId: filters.countryId,
    status: filters.status,
  });

  const hasNoResults = !isLoading && data?.items.length === 0 && (filters.q || filters.departmentId || filters.countryId || filters.status);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" component="h1">
          Employee Directory
        </Typography>
        <Button variant="contained" onClick={() => navigate("/employees/new")}>
          Add Employee
        </Button>
      </Stack>
      <FilterBar value={filters} onChange={setFilters} />
      {isError ? <Alert severity="error">Failed to load employees.</Alert> : null}
      {hasNoResults ? (
        <Alert severity="info">No employees match your search or filter criteria.</Alert>
      ) : null}
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
          onRowClick={handleRowClick}
          sx={{ cursor: "pointer" }}
        />
      </Box>
    </Box>
  );
}
