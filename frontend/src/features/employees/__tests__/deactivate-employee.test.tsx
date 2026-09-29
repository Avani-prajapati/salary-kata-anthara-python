import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { server } from "../../../test/msw/server";
import { DirectoryPage } from "../DirectoryPage";
import { ProfilePage } from "../ProfilePage";

const API_BASE_URL = "http://localhost:8000";

function employeeWire(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada.lovelace@example.com",
    job_title: "Senior Engineer",
    department_id: "engineering",
    country_id: "gb",
    salary_amount: "95000.00",
    salary_currency: "GBP",
    hire_date: "2020-01-15",
    status: "active",
    ...overrides,
  };
}

function renderWithProviders(initialRoute = "/employees/1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/" element={<DirectoryPage />} />
          <Route path="/employees/:employeeId" element={<ProfilePage />} />
          <Route path="/employees/new" element={<div>Add Employee</div>} />
          <Route path="/employees/:employeeId/edit" element={<div>Edit Employee</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("deactivating an employee", () => {
  it("updates the visible status badge on the profile screen without a manual refresh", async () => {
    let currentEmployee = employeeWire();
    server.use(
      http.get(`${API_BASE_URL}/api/employees/1`, () => HttpResponse.json(currentEmployee)),
      http.post(`${API_BASE_URL}/api/employees/1/deactivate`, async () => {
        currentEmployee = { ...currentEmployee, status: "inactive" };
        return HttpResponse.json(currentEmployee);
      }),
    );

    const user = userEvent.setup();
    renderWithProviders("/employees/1");

    const deactivateButton = await screen.findByRole("button", { name: "Deactivate" });
    await user.click(deactivateButton);

    expect(await screen.findByText("Inactive")).toBeInTheDocument();
  });

  it("hides the deactivate button after deactivation", async () => {
    let currentEmployee = employeeWire();
    server.use(
      http.get(`${API_BASE_URL}/api/employees/1`, () => HttpResponse.json(currentEmployee)),
      http.post(`${API_BASE_URL}/api/employees/1/deactivate`, async () => {
        currentEmployee = { ...currentEmployee, status: "inactive" };
        return HttpResponse.json(currentEmployee);
      }),
    );

    const user = userEvent.setup();
    renderWithProviders("/employees/1");

    const deactivateButton = await screen.findByRole("button", { name: "Deactivate" });
    await user.click(deactivateButton);

    expect(screen.queryByRole("button", { name: "Deactivate" })).not.toBeInTheDocument();
  });

  it("hides the deactivate button when viewing an inactive employee", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/employees/1`, () => HttpResponse.json(employeeWire({ status: "inactive" }))),
    );

    renderWithProviders("/employees/1");

    expect(screen.queryByRole("button", { name: "Deactivate" })).not.toBeInTheDocument();
  });
});
