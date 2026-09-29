import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { server } from "../../../test/msw/server";
import { EditEmployeePage } from "../EditEmployeePage";
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

function renderWithProviders() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/employees/1/edit"]}>
        <Routes>
          <Route path="/employees/:employeeId" element={<ProfilePage />} />
          <Route path="/employees/:employeeId/edit" element={<EditEmployeePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("editing an employee", () => {
  it("shows the updated salary on the profile screen after saving, without a manual refresh", async () => {
    let currentEmployee = employeeWire();
    server.use(
      http.get(`${API_BASE_URL}/api/employees/1`, () => HttpResponse.json(currentEmployee)),
      http.patch(`${API_BASE_URL}/api/employees/1`, async ({ request }) => {
        const patch = (await request.json()) as Record<string, unknown>;
        currentEmployee = { ...currentEmployee, ...patch };
        return HttpResponse.json(currentEmployee);
      }),
    );

    const user = userEvent.setup();
    renderWithProviders();

    const salaryField = await screen.findByLabelText("Salary Amount");
    await user.clear(salaryField);
    await user.type(salaryField, "120000");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText(/120000/)).toBeInTheDocument();
  });
});
