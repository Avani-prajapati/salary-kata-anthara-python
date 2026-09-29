import type { ReactNode } from "react";
import { Box, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { COUNTRIES, DEPARTMENTS, STATUSES } from "./referenceData";
import type { EmployeeStatus } from "./types";

export interface FilterState {
  q?: string;
  departmentId?: string;
  countryId?: string;
  status?: EmployeeStatus;
}

interface FilterBarProps {
  readonly value: FilterState;
  readonly onChange: (next: FilterState) => void;
}

function FilterField({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Box sx={{ minWidth: 200 }}>
      {children}
    </Box>
  );
}

export function FilterBar({ value, onChange }: Readonly<FilterBarProps>) {
  return (
    <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "flex-start" }}>
      <FilterField>
        <TextField
          label="Search"
          placeholder="Name, email..."
          value={value.q ?? ""}
          onChange={(e) => onChange({ ...value, q: e.target.value || undefined })}
          size="small"
          sx={{ width: "100%" }}
        />
      </FilterField>

      <FilterField>
        <FormControl size="small" sx={{ width: "100%" }}>
          <InputLabel id="department-label">Department</InputLabel>
          <Select
            labelId="department-label"
            id="department-select"
            value={value.departmentId ?? ""}
            label="Department"
            onChange={(e) => onChange({ ...value, departmentId: e.target.value || undefined })}
          >
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            {DEPARTMENTS.map((dept) => (
              <MenuItem key={dept.id} value={dept.id}>
                {dept.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </FilterField>

      <FilterField>
        <FormControl size="small" sx={{ width: "100%" }}>
          <InputLabel id="country-label">Country</InputLabel>
          <Select
            labelId="country-label"
            id="country-select"
            value={value.countryId ?? ""}
            label="Country"
            onChange={(e) => onChange({ ...value, countryId: e.target.value || undefined })}
          >
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            {COUNTRIES.map((country) => (
              <MenuItem key={country.id} value={country.id}>
                {country.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </FilterField>

      <FilterField>
        <FormControl size="small" sx={{ width: "100%" }}>
          <InputLabel id="status-label">Status</InputLabel>
          <Select
            labelId="status-label"
            id="status-select"
            value={value.status ?? ""}
            label="Status"
            onChange={(e) => onChange({ ...value, status: (e.target.value as EmployeeStatus) || undefined })}
          >
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            {STATUSES.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </FilterField>
    </Box>
  );
}
