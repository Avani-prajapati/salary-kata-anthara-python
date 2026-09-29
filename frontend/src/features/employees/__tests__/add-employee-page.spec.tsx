import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { server } from "../../../test/msw/server";
import { AddEmployeePage } from "../AddEmployeePage";
import { ProfilePage } from "../ProfilePage";

const API_BASE_URL = "http://localhost:8000";

function renderWithProviders() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/employees/new"]}>
        <Routes>
          <Route path="/employees/new" element={<AddEmployeePage />} />
          <Route path="/employees/:employeeId" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("First Name"), "Ada");
  await user.type(screen.getByLabelText("Last Name"), "Lovelace");
  await user.type(screen.getByLabelText("Email"), "ada.lovelace@example.com");
  await user.type(screen.getByLabelText("Job Title"), "Senior Engineer");
  await user.click(screen.getByRole("combobox", { name: "Department" }));
  await user.click(await screen.findByRole("option", { name: "Engineering" }));
  await user.click(screen.getByRole("combobox", { name: "Country" }));
  await user.click(await screen.findByRole("option", { name: "United Kingdom" }));
  await user.type(screen.getByLabelText("Hire Date"), "2024-03-01");
}

describe("adding a new employee", () => {
  it("navigates to the new employee's profile after a valid submission", async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/employees`, () =>
        HttpResponse.json(
          {
            id: 42,
            first_name: "Ada",
            last_name: "Lovelace",
            email: "ada.lovelace@example.com",
            job_title: "Senior Engineer",
            department_id: "engineering",
            country_id: "gb",
            salary_amount: "95000.00",
            salary_currency: "GBP",
            hire_date: "2024-03-01",
            status: "active",
          },
          { status: 201 },
        ),
      ),
      http.get(`${API_BASE_URL}/api/employees/42`, () =>
        HttpResponse.json({
          id: 42,
          first_name: "Ada",
          last_name: "Lovelace",
          email: "ada.lovelace@example.com",
          job_title: "Senior Engineer",
          department_id: "engineering",
          country_id: "gb",
          salary_amount: "95000.00",
          salary_currency: "GBP",
          hire_date: "2024-03-01",
          status: "active",
        }),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders();

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText("Salary Amount"), "95000");
    await user.click(screen.getByRole("button", { name: "Add Employee" }));

    expect(await screen.findByText("ada.lovelace@example.com")).toBeInTheDocument();
    expect(screen.getByText("Senior Engineer")).toBeInTheDocument();
  });

  it("shows a field error and does not submit when the salary is negative", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText("Salary Amount"), "-500");
    await user.click(screen.getByRole("button", { name: "Add Employee" }));

    expect(await screen.findByText("Salary must be greater than zero")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Employee" })).toBeInTheDocument();
  });
});
