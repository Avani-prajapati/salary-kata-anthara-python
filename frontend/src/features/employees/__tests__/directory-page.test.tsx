import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { server } from "../../../test/msw/server";
import { DirectoryPage } from "../DirectoryPage";

const API_BASE_URL = "http://localhost:8000";

function employeeWire(overrides: Record<string, unknown>) {
  return {
    id: 1,
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada.lovelace@example.com",
    job_title: "Engineer",
    department_id: "engineering",
    country_id: "gb",
    salary_amount: "95000.00",
    salary_currency: "GBP",
    hire_date: "2020-01-15",
    status: "active",
    ...overrides,
  };
}

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("employee directory", () => {
  it("renders a row for every employee in the faked first page of results", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/employees`, () =>
        HttpResponse.json({
          items: [
            employeeWire({ id: 1, first_name: "Ada", last_name: "Lovelace" }),
            employeeWire({ id: 2, first_name: "Grace", last_name: "Hopper" }),
          ],
          total: 75,
          page: 1,
          page_size: 50,
        }),
      ),
    );

    renderWithProviders(<DirectoryPage />);

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("re-requests the next page of employees when the pagination control advances", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/employees`, ({ request }) => {
        const requestedPage = new URL(request.url).searchParams.get("page");

        if (requestedPage === "2") {
          return HttpResponse.json({
            items: [employeeWire({ id: 3, first_name: "Katherine", last_name: "Johnson" })],
            total: 75,
            page: 2,
            page_size: 50,
          });
        }

        return HttpResponse.json({
          items: [employeeWire({ id: 1, first_name: "Ada", last_name: "Lovelace" })],
          total: 75,
          page: 1,
          page_size: 50,
        });
      }),
    );

    renderWithProviders(<DirectoryPage />);

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Go to next page" }));

    expect(await screen.findByText("Katherine Johnson")).toBeInTheDocument();
  });
});
