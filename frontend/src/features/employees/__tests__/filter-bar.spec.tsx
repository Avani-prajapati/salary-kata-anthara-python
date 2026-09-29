import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FilterBar, type FilterState } from "../FilterBar";

function ControlledFilterBar() {
  const [filters, setFilters] = useState<FilterState>({});
  return <FilterBar value={filters} onChange={setFilters} />;
}

describe("FilterBar", () => {
  it("renders all filter controls with accessible labels", () => {
    const onChange = vi.fn();
    render(<FilterBar value={{}} onChange={onChange} />);

    expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/department/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
  });

  it("updates search input when text is typed", async () => {
    const user = userEvent.setup();
    render(<ControlledFilterBar />);

    const searchInput = screen.getByLabelText(/search/i) as HTMLInputElement;
    await user.type(searchInput, "alice");

    expect(searchInput.value).toBe("alice");
  });

  it("narrows the directory to a chosen department", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FilterBar value={{}} onChange={onChange} />);

    const deptSelect = screen.getByLabelText(/department/i);
    await user.click(deptSelect);

    const engineeringOption = screen.getByRole("option", { name: /engineering/i });
    await user.click(engineeringOption);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ departmentId: "engineering" })
    );
  });

  it("narrows the directory to a chosen country", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FilterBar value={{}} onChange={onChange} />);

    const countrySelect = screen.getByLabelText(/country/i);
    await user.click(countrySelect);

    const usOption = screen.getByRole("option", { name: /United States/i });
    await user.click(usOption);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ countryId: "us" })
    );
  });

  it("narrows the directory to a chosen employment status", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FilterBar value={{}} onChange={onChange} />);

    const statusSelect = screen.getByLabelText(/status/i);
    await user.click(statusSelect);

    const inactiveOption = screen.getByRole("option", { name: /inactive/i });
    await user.click(inactiveOption);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: "inactive" })
    );
  });

  it("preserves other filters when one is changed", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const existingFilters = {
      q: "alice",
      departmentId: "engineering",
    };
    render(<FilterBar value={existingFilters} onChange={onChange} />);

    const countrySelect = screen.getByLabelText(/country/i);
    await user.click(countrySelect);

    const usOption = screen.getByRole("option", { name: /United States/i });
    await user.click(usOption);

    expect(onChange).toHaveBeenCalledWith({
      q: "alice",
      departmentId: "engineering",
      countryId: "us",
    });
  });

  it("displays current search filter value", () => {
    const onChange = vi.fn();
    const filters = {
      q: "john",
      departmentId: "sales",
      status: "active" as const,
    };
    render(<FilterBar value={filters} onChange={onChange} />);

    const searchInput = screen.getByLabelText(/search/i) as HTMLInputElement;
    expect(searchInput.value).toBe("john");
  });
});
