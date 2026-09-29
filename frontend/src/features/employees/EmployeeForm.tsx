import {
  Alert,
  AlertTitle,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  Link,
  List,
  ListItem,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
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

const FIELD_LABELS: Record<keyof EmployeeFormValues, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email",
  jobTitle: "Job Title",
  departmentId: "Department",
  countryId: "Country",
  hireDate: "Hire Date",
  salaryAmount: "Salary Amount",
};

const FIELD_IDS: Record<keyof EmployeeFormValues, string> = {
  firstName: "employee-form-first-name",
  lastName: "employee-form-last-name",
  email: "employee-form-email",
  jobTitle: "employee-form-job-title",
  departmentId: "employee-form-department",
  countryId: "employee-form-country",
  hireDate: "employee-form-hire-date",
  salaryAmount: "employee-form-salary-amount",
};

const REQUIRED_INPUT_PROPS = { required: true, "aria-required": true };

interface EmployeeFormProps {
  readonly mode: "add" | "edit";
  readonly initialValues?: Partial<EmployeeFormValues>;
  readonly onSubmit: (values: EmployeeFormValues) => void;
}

function ErrorSummary({ errors }: Readonly<{ errors: FieldErrors<EmployeeFormValues> }>) {
  const fieldsWithErrors = (Object.keys(FIELD_LABELS) as Array<keyof EmployeeFormValues>).filter(
    (field) => errors[field],
  );

  if (fieldsWithErrors.length === 0) {
    return null;
  }

  return (
    <Alert severity="error">
      <AlertTitle>Please fix the following before submitting</AlertTitle>
      <List dense disablePadding>
        {fieldsWithErrors.map((field) => (
          <ListItem key={field} disablePadding>
            <Link href={`#${FIELD_IDS[field]}`}>
              {FIELD_LABELS[field]}: {errors[field]?.message}
            </Link>
          </ListItem>
        ))}
      </List>
    </Alert>
  );
}

export function EmployeeForm({ mode, initialValues, onSubmit }: Readonly<EmployeeFormProps>) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    defaultValues: { ...EMPTY_VALUES, ...initialValues },
  });

  return (
    <Stack spacing={2}>
      <ErrorSummary errors={errors} />
      <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          id={FIELD_IDS.firstName}
          label="First Name"
          autoComplete="given-name"
          error={Boolean(errors.firstName)}
          helperText={errors.firstName?.message}
          inputProps={REQUIRED_INPUT_PROPS}
          {...register("firstName", { required: "First name is required" })}
        />
        <TextField
          id={FIELD_IDS.lastName}
          label="Last Name"
          autoComplete="family-name"
          error={Boolean(errors.lastName)}
          helperText={errors.lastName?.message}
          inputProps={REQUIRED_INPUT_PROPS}
          {...register("lastName", { required: "Last name is required" })}
        />
        <TextField
          id={FIELD_IDS.email}
          label="Email"
          type="email"
          autoComplete="email"
          error={Boolean(errors.email)}
          helperText={errors.email?.message}
          inputProps={REQUIRED_INPUT_PROPS}
          {...register("email", {
            required: "Email is required",
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address" },
          })}
        />
        <TextField
          id={FIELD_IDS.jobTitle}
          label="Job Title"
          autoComplete="organization-title"
          error={Boolean(errors.jobTitle)}
          helperText={errors.jobTitle?.message}
          inputProps={REQUIRED_INPUT_PROPS}
          {...register("jobTitle", { required: "Job title is required" })}
        />
        <Controller
          name="departmentId"
          control={control}
          rules={{ required: "Department is required" }}
          render={({ field }) => (
            <FormControl error={Boolean(errors.departmentId)}>
              <InputLabel id="employee-form-department-label">Department</InputLabel>
              <Select
                {...field}
                id={FIELD_IDS.departmentId}
                labelId="employee-form-department-label"
                label="Department"
                required
                inputProps={{ "aria-required": true }}
              >
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
              <Select
                {...field}
                id={FIELD_IDS.countryId}
                labelId="employee-form-country-label"
                label="Country"
                required
                inputProps={{ "aria-required": true }}
              >
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
          id={FIELD_IDS.hireDate}
          label="Hire Date"
          type="date"
          autoComplete="off"
          InputLabelProps={{ shrink: true }}
          error={Boolean(errors.hireDate)}
          helperText={errors.hireDate?.message}
          inputProps={REQUIRED_INPUT_PROPS}
          {...register("hireDate", { required: "Hire date is required" })}
        />
        <TextField
          id={FIELD_IDS.salaryAmount}
          label="Salary Amount"
          type="number"
          error={Boolean(errors.salaryAmount)}
          helperText={errors.salaryAmount?.message}
          inputProps={{ step: "0.01", ...REQUIRED_INPUT_PROPS }}
          {...register("salaryAmount", {
            required: "Salary amount is required",
            validate: (value) => Number(value) > 0 || "Salary must be greater than zero",
          })}
        />
        <Button type="submit" variant="contained">
          {mode === "add" ? "Add Employee" : "Save Changes"}
        </Button>
      </Stack>
    </Stack>
  );
}
