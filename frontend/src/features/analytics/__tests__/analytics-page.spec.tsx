import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../test/msw/server";
import { AnalyticsPage } from "../AnalyticsPage";

const API_BASE_URL = "http://localhost:8000";

function figures(headcount: number, avgSalary: string) {
  return {
    currency: "USD",
    headcount,
    avg_salary: avgSalary,
    median_salary: avgSalary,
    min_salary: avgSalary,
    max_salary: avgSalary,
  };
}

const ACTIVE_ONLY = {
  departments: [{ department_id: "engineering", department_name: "Engineering", ...figures(1, "60000.00") }],
  countries: [{ country_id: "us", country_name: "United States", ...figures(1, "60000.00") }],
  payBands: [
    { label: "40k-70k", headcount: 1 },
    { label: "100k-150k", headcount: 0 },
  ],
};

const INCLUDING_INACTIVE = {
  departments: [{ department_id: "engineering", department_name: "Engineering", ...figures(2, "80000.00") }],
  countries: [{ country_id: "us", country_name: "United States", ...figures(2, "80000.00") }],
  payBands: [
    { label: "40k-70k", headcount: 1 },
    { label: "100k-150k", headcount: 1 },
  ],
};

function analyticsFor(request: Request) {
  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
  return includeInactive ? INCLUDING_INACTIVE : ACTIVE_ONLY;
}

function serveAnalytics() {
  server.use(
    http.get(`${API_BASE_URL}/api/analytics/by-department`, ({ request }) =>
      HttpResponse.json(analyticsFor(request).departments),
    ),
    http.get(`${API_BASE_URL}/api/analytics/by-country`, ({ request }) =>
      HttpResponse.json(analyticsFor(request).countries),
    ),
    http.get(`${API_BASE_URL}/api/analytics/pay-bands`, ({ request }) =>
      HttpResponse.json(analyticsFor(request).payBands),
    ),
  );
}

function renderAnalyticsPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AnalyticsPage />
    </QueryClientProvider>,
  );
}

async function rowFor(tableName: string, rowName: string) {
  const table = await screen.findByRole("table", { name: tableName });
  return within(table).getByRole("row", { name: new RegExp(rowName) });
}

describe("the analytics screen's include-inactive toggle", () => {
  it("shows by default that figures cover active employees only, with the toggle visibly off", async () => {
    serveAnalytics();

    renderAnalyticsPage();

    expect(screen.getByLabelText("Include inactive employees")).not.toBeChecked();
    expect(screen.getByText(/Figures cover active employees only/)).toBeInTheDocument();
    const engineering = await rowFor("Pay by department", "Engineering");
    expect(await within(engineering).findAllByText("60000.00 USD")).toHaveLength(4);
  });

  it("re-fetches every view with inactive employees included once the toggle is switched on", async () => {
    serveAnalytics();
    const user = userEvent.setup();
    renderAnalyticsPage();
    await rowFor("Pay by department", "Engineering");

    await user.click(screen.getByLabelText("Include inactive employees"));

    expect(screen.getByLabelText("Include inactive employees")).toBeChecked();
    expect(screen.getByText(/Figures cover active and inactive employees/)).toBeInTheDocument();
    expect(await screen.findByText(/Headcount: 2/)).toBeInTheDocument();
    const engineering = await rowFor("Pay by department", "Engineering");
    expect(await within(engineering).findAllByText("80000.00 USD")).toHaveLength(4);
    const unitedStates = await rowFor("Pay by country", "United States");
    expect(await within(unitedStates).findAllByText("80000.00 USD")).toHaveLength(4);
    const upperBand = await rowFor("Pay-band distribution (USD-normalized)", "100k-150k");
    expect(await within(upperBand).findByText("1")).toBeInTheDocument();
  });
});
