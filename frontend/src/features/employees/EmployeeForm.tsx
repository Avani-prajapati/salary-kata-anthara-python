import { Button, FormControl, FormHelperText, InputLabel, MenuItem, Select, Stack, TextField } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { COUNTRIES, DEPARTMENTS } from "./referenceData";
import type { EmployeeFormValues } from "./types";

const EMPTY_VALUES: EmployeeFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  jobTitle: "",
  departmentId: "",
  countryId: "",
  hireDate: "",
  salaryAmount: "",
};

interface EmployeeFormProps {
  readonly mode: "add" | "edit";
  readonly initialValues?: Partial<EmployeeFormValues>;
  readonly onSubmit: (values: EmployeeFormValues) => void;
}

export function EmployeeForm({ mode, initialValues, onSubmit }: EmployeeFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    defaultValues: { ...EMPTY_VALUES, ...initialValues },
  });

  return (
    <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)} noValidate>
      <TextField
        label="First Name"
        autoComplete="given-name"
        error={Boolean(errors.firstName)}
        helperText={errors.firstName?.message}
        {...register("firstName", { required: "First name is required" })}
      />
      <TextField
        label="Last Name"
        autoComplete="family-name"
        error={Boolean(errors.lastName)}
        helperText={errors.lastName?.message}
        {...register("lastName", { required: "Last name is required" })}
      />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
        {...register("email", {
          required: "Email is required",
          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address" },
        })}
      />
      <TextField
        label="Job Title"
        autoComplete="organization-title"
        error={Boolean(errors.jobTitle)}
        helperText={errors.jobTitle?.message}
        {...register("jobTitle", { required: "Job title is required" })}
      />
      <Controller
        name="departmentId"
        control={control}
        rules={{ required: "Department is required" }}
        render={({ field }) => (
          <FormControl error={Boolean(errors.departmentId)}>
            <InputLabel id="employee-form-department-label">Department</InputLabel>
            <Select {...field} labelId="employee-form-department-label" label="Department">
              {DEPARTMENTS.map((department) => (
                <MenuItem key={department.id} value={department.id}>
                  {department.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{errors.departmentId?.message}</FormHelperText>
          </FormControl>
        )}
      />
      <Controller
        name="countryId"
        control={control}
        rules={{ required: "Country is required" }}
        render={({ field }) => (
          <FormControl error={Boolean(errors.countryId)}>
            <InputLabel id="employee-form-country-label">Country</InputLabel>
            <Select {...field} labelId="employee-form-country-label" label="Country">
              {COUNTRIES.map((country) => (
                <MenuItem key={country.id} value={country.id}>
                  {country.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{errors.countryId?.message}</FormHelperText>
          </FormControl>
        )}
      />
      <TextField
        label="Hire Date"
        type="date"
        autoComplete="off"
        InputLabelProps={{ shrink: true }}
        error={Boolean(errors.hireDate)}
        helperText={errors.hireDate?.message}
        {...register("hireDate", { required: "Hire date is required" })}
      />
      <TextField
        label="Salary Amount"
        type="number"
        inputProps={{ step: "0.01" }}
        error={Boolean(errors.salaryAmount)}
        helperText={errors.salaryAmount?.message}
        {...register("salaryAmount", {
          required: "Salary amount is required",
          validate: (value) => Number(value) > 0 || "Salary must be greater than zero",
        })}
      />
      <Button type="submit" variant="contained">
        {mode === "add" ? "Add Employee" : "Save Changes"}
      </Button>
    </Stack>
  );
}
