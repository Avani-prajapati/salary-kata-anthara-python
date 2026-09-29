import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

function stubViewportMatchMedia(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
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

  it("exposes each employee's name as a real link to their profile, reachable by keyboard", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/employees`, () =>
        HttpResponse.json({
          items: [employeeWire({ id: 1, first_name: "Ada", last_name: "Lovelace" })],
          total: 1,
          page: 1,
          page_size: 50,
        }),
      ),
    );

    renderWithProviders(<DirectoryPage />);

    const profileLink = await screen.findByRole("link", { name: "Ada Lovelace" });
    expect(profileLink).toHaveAttribute("href", "/employees/1");
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

describe("employee directory on a narrow viewport", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    stubViewportMatchMedia(true);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("renders a stacked card per employee showing department, country, salary and status", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/employees`, () =>
        HttpResponse.json({
          items: [employeeWire({ id: 1, first_name: "Ada", last_name: "Lovelace" })],
          total: 1,
          page: 1,
          page_size: 50,
        }),
      ),
    );

    renderWithProviders(<DirectoryPage />);

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Engineering · United Kingdom")).toBeInTheDocument();
    expect(screen.getByText("95000.00 GBP")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("exposes each employee's card as a real link to their profile, reachable by keyboard", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/employees`, () =>
        HttpResponse.json({
          items: [employeeWire({ id: 7, first_name: "Grace", last_name: "Hopper" })],
          total: 1,
          page: 1,
          page_size: 50,
        }),
      ),
    );

    renderWithProviders(<DirectoryPage />);

    const profileLink = await screen.findByRole("link", { name: /Grace Hopper/ });
    expect(profileLink).toHaveAttribute("href", "/employees/7");
  });
});
