import { describe, expect, it } from "vitest";
import {
  CANADIAN_REGIONS,
  filterGrants,
  fundingByDepartment,
  fundingByRegion,
  sortGrants,
  uniqueValues
} from "./data";
import type { Grant } from "./types";

const grant = (overrides: Partial<Grant>): Grant => ({
  record_id: "grant-1",
  recipient_name: "Community Group",
  agreement_title: "Youth program",
  agreement_value: 100,
  agreement_start_date: "2025-01-01",
  agreement_end_date: null,
  province: "ON",
  city: "Ottawa",
  department: "Department A",
  program_name: "Community Fund",
  description: "Local programming",
  source_url: "https://example.ca",
  retrieved_at: "2026-01-01T00:00:00Z",
  ...overrides
});

const grants = [
  grant({ record_id: "1" }),
  grant({ record_id: "2", recipient_name: "Northern Lab", province: "YT", department: "Department B", agreement_value: 400 }),
  grant({ record_id: "3", department: "Department A", agreement_value: 50 })
];
const emptyFilters = {
  query: "",
  searchMode: "all" as const,
  searchField: "all" as const,
  province: "",
  department: "",
  dateField: "start" as const,
  startDate: "",
  endDate: "",
  minimumValue: "",
  maximumValue: "",
  sort: "date_desc" as const
};

describe("filterGrants", () => {
  it("searches text fields without case sensitivity", () => {
    expect(filterGrants(grants, { ...emptyFilters, query: "northern" })).toHaveLength(1);
  });

  it("supports scoped all-word, any-word, and exact-phrase searches", () => {
    expect(filterGrants(grants, {
      ...emptyFilters,
      query: "Northern Lab",
      searchMode: "all",
      searchField: "recipient"
    })).toHaveLength(1);
    expect(filterGrants(grants, {
      ...emptyFilters,
      query: "missing northern",
      searchMode: "any",
      searchField: "recipient"
    })).toHaveLength(1);
    expect(filterGrants(grants, {
      ...emptyFilters,
      query: "Community Group",
      searchMode: "phrase",
      searchField: "recipient"
    })).toHaveLength(2);
  });

  it("combines province and department filters", () => {
    expect(filterGrants(grants, { ...emptyFilters, province: "ON", department: "Department A" })).toHaveLength(2);
  });

  it("filters by agreement start date and funding range", () => {
    expect(filterGrants([
      grant({ record_id: "old", agreement_start_date: "2023-01-01", agreement_value: 500 }),
      grant({ record_id: "match", agreement_start_date: "2025-06-01", agreement_value: 500 }),
      grant({ record_id: "small", agreement_start_date: "2025-06-01", agreement_value: 50 }),
      grant({ record_id: "large", agreement_start_date: "2025-06-01", agreement_value: 5000 }),
      grant({ record_id: "undated", agreement_start_date: null, agreement_value: 500 })
    ], {
      ...emptyFilters,
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      minimumValue: "100",
      maximumValue: "1000"
    }).map(({ record_id }) => record_id)).toEqual(["match"]);
  });

  it("filters agreements active during a date range", () => {
    expect(filterGrants([
      grant({ record_id: "active", agreement_start_date: "2024-01-01", agreement_end_date: "2026-01-01" }),
      grant({ record_id: "future", agreement_start_date: "2027-01-01", agreement_end_date: "2027-12-31" })
    ], {
      ...emptyFilters,
      dateField: "active",
      startDate: "2025-01-01",
      endDate: "2025-12-31"
    }).map(({ record_id }) => record_id)).toEqual(["active"]);
  });

  it("sorts newest first by default and leaves undated records last", () => {
    const sorted = sortGrants([
      grant({ record_id: "undated", agreement_start_date: null }),
      grant({ record_id: "older", agreement_start_date: "2024-01-01" }),
      grant({ record_id: "newer", agreement_start_date: "2025-01-01" })
    ], "date_desc");

    expect(sorted.map(({ record_id }) => record_id))
      .toEqual(["newer", "older", "undated"]);
  });
});

describe("aggregations", () => {
  it("orders departments by total funding", () => {
    expect(fundingByDepartment(grants).map(({ name, value }) => ({ name, value }))).toEqual([
      { name: "Department B", value: 400 },
      { name: "Department A", value: 150 }
    ]);
  });

  it("returns sorted unique values", () => {
    expect(uniqueValues(grants, "province")).toEqual(["ON", "YT"]);
  });

  it("returns every region and distinguishes missing and unrecognized locations", () => {
    const totals = fundingByRegion([
      ...grants,
      grant({ record_id: "4", province: null, agreement_value: 25 }),
      grant({ record_id: "5", province: "XX", agreement_value: 75 })
    ]);
    const ontario = totals.regions.find((region) => region.code === "ON");

    expect(totals.regions).toHaveLength(CANADIAN_REGIONS.length);
    expect(ontario).toMatchObject({ value: 150, count: 2 });
    // Missing and invalid codes both contribute to the displayed unknown total,
    // while the breakdown keeps data-quality issues visible.
    expect(totals.unknown).toMatchObject({ value: 100, count: 2 });
    expect(totals.missing).toMatchObject({ value: 25, count: 1 });
    expect(totals.unrecognized).toMatchObject({ value: 75, count: 1 });
  });
});
