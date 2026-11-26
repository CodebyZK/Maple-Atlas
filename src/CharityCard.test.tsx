import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import CharityCard from "./CharityCard";
import type { CharityInfo } from "./types";

afterEach(cleanup);

function charity(amounts: Partial<CharityInfo["amounts"]> = {}): CharityInfo {
  return {
    registrationNumber: "108161779RR0001",
    legalName: "UNIVERSITY OF EXAMPLE",
    designation: "Charitable organization",
    category: "Teaching institutions",
    city: "VANCOUVER",
    province: "BC",
    fiscalPeriodEnd: "2024-03-31",
    sectionUsed: "6",
    listYear: "2024",
    amounts: {
      revenue_federal: 380_000_000,
      revenue_provincial: 1_200_000_000,
      revenue_municipal: null,
      revenue_government_total: 1_580_000_000,
      total_revenue: 3_700_000_000,
      charitable_programs: 3_300_000_000,
      management_and_administration: 200_000_000,
      fundraising: null,
      total_expenditures: 3_500_000_000,
      total_assets: 8_300_000_000,
      total_liabilities: 5_600_000_000,
      ...amounts
    },
    source: "Canada Revenue Agency, List of charities",
    sourceUrl: "https://open.canada.ca/data/en/dataset/80c00cdb-1358-415c-bb8b-0de7f12675b8"
  };
}

describe("CharityCard", () => {
  it("shows revenue, government share and levels, skipping unreported ones", () => {
    render(<CharityCard charity={charity()} />);

    expect(screen.getByRole("heading", { name: "Registered charity" })).toBeInTheDocument();
    expect(screen.getByText("Charitable organization · Teaching institutions")).toBeInTheDocument();
    expect(screen.getByText(/fiscal year ending March 31, 2024/)).toBeInTheDocument();
    expect(screen.getByText("43% of revenue")).toBeInTheDocument();
    expect(screen.getByText("94% of spending")).toBeInTheDocument();
    expect(screen.getByText("Federal")).toBeInTheDocument();
    expect(screen.getByText("Provincial or territorial")).toBeInTheDocument();
    expect(screen.queryByText("Municipal or regional")).toBeNull();
    expect(screen.getByRole("link", { name: /Canada Revenue Agency/ })).toHaveAttribute("href", expect.stringContaining("open.canada.ca"));
  });

  it("explains a combined government amount and never shows unreported values as zero", () => {
    render(
      <CharityCard
        charity={charity({ revenue_federal: null, revenue_provincial: null, revenue_government_total: 40_000, total_revenue: null })}
      />
    );

    expect(screen.getByText(/one combined amount/)).toBeInTheDocument();
    expect(screen.getByText("Not reported")).toBeInTheDocument();
    expect(screen.queryByText("$0")).toBeNull();
  });
});
