import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { server } from "../../../test/msw/server";
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

function renderWithProviders(initialRoute: string = "/employees/1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/employees/:employeeId" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("employee profile", () => {
  it("displays the full employee record when fetched successfully", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/employees/1`, () => HttpResponse.json(employeeWire())),
    );

    renderWithProviders("/employees/1");

    expect(await screen.findByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada.lovelace@example.com")).toBeInTheDocument();
    expect(screen.getByText("Senior Engineer")).toBeInTheDocument();
    expect(screen.getByText("2020-01-15")).toBeInTheDocument();
  });

  it("displays an error message when the employee cannot be fetched", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/employees/999`, () =>
        HttpResponse.json({ code: "not_found", message: "employee 999 not found" }, { status: 404 }),
      ),
    );

    renderWithProviders("/employees/999");

    expect(await screen.findByText(/Failed to load employee profile/i)).toBeInTheDocument();
  });
});
