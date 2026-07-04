import { describe, expect, it } from "vitest";
import {
  CANADIAN_REGIONS,
  filterGrants,
  fundingByDepartment,
  fundingByRegion,
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

describe("filterGrants", () => {
  it("searches text fields without case sensitivity", () => {
    expect(filterGrants(grants, { query: "northern", province: "", department: "" })).toHaveLength(1);
  });

  it("combines province and department filters", () => {
    expect(filterGrants(grants, { query: "", province: "ON", department: "Department A" })).toHaveLength(2);
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
